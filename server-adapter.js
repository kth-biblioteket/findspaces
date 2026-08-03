/**
 * 
 * Fil som agerar web/proxy-server för appen.
 * 
 * Hanterar även login via KTH ldap
 * 
 */
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './.output/server/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, '.output', 'public');
const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];

createServer(async (req, res) => {
  const fullUrl = `http://${req.headers.host}${req.url}`;
  const url = new URL(fullUrl);
  const pathname = url.pathname;
  console.log("pathname: ", pathname);
  console.log("req method: ", req.method);

  // 0. Fånga upp Supabases inloggningsanrop och kör via KTH LDAP + Supabase Auth
  if (pathname === '/api/auth/v1/token' && req.method === 'POST') {
    const grantType = url.searchParams.get('grant_type');
    let body = '';
    req.on('data', chunk => { body += chunk; });

    return req.on('end', async () => {
      try {
        // Parsa JSON-body som Supabase skickar
        const data = JSON.parse(body);
        const email = data.email;
        const password = data.password;

        console.log("Auth Intercepted - GrantType:", grantType, "Email:", email);
        console.log("grantType: ", grantType);

        // Om det är ett lösenordsanrop från supabase.auth.signInWithPassword
        if (grantType === 'password' && email && password) {
          console.log("kör mot KTH");
          // 1. Verifiera mot KTH LDAP-API och hämta token
          const kthRes = await fetch('http://ldap-api/api/v1/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password }),
          });

          const kthData = await kthRes.json();
          console.log("kthData: ", kthData);
          if (!kthRes.ok || !kthData.auth || !kthData.token) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              error: "invalid_grant",
              error_description: "Invalid login credentials"
            }));
          }

          // 1.5. Använd KTH-token för att kontrollera att användaren tillhör biblioteket (pa.anstallda.T.TRA.)
          try {
            const username = email.split('@')[0];
            const accountRes = await fetch(`http://ldap-api/api/v1/account/${encodeURIComponent(username)}`, {
              headers: {
                'x-access-token': kthData.token
              }
            });

            if (accountRes.ok) {
              const accountData = await accountRes.json();
              const userObj = accountData.ugusers ? accountData.ugusers[0] : accountData;
              const userGroups = userObj?.kthPAGroupMembership || userObj?.memberOf || [];
              const groupRegex = /pa\.anstallda\.T\.TRA./i;
              const groupsArray = Array.isArray(userGroups) ? userGroups : [userGroups];
              const isLibraryEmployee = groupsArray.some(group => groupRegex.test(group));

              if (!isLibraryEmployee) {
                console.log("Access denied for:", email, "- Not in library group.");
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                  error: "access_denied",
                  error_description: "Endast anställda på biblioteket har behörighet."
                }));
              }
            } else {
              console.log("Could not fetch account info for group check:", email, accountRes.status);
              res.writeHead(403, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                error: "access_denied",
                error_description: "Kunde inte verifiera behörighet mot LDAP-konto."
              }));
            }
          } catch (groupErr) {
            console.error("Group check error:", groupErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              error: "server_error",
              error_description: "Fel vid kontroll av behörighetsgrupper."
            }));
          }

          // 2. Om KTH godkänner och tillhör biblioteket: Hantera Supabase Admin (skapa eller uppdatera lösenord)
          const adminKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
          console.log("Checking/Creating/Updating user in Supabase for:", email);

          const listUsersRes = await fetch(`http://supabase-auth:9999/admin/users`, {
            method: 'GET',
            headers: {
              'apikey': adminKey,
              'Authorization': `Bearer ${adminKey}`
            }
          });

          let userId = null;
          if (listUsersRes.ok) {
            const usersData = await listUsersRes.json();
            const usersList = usersData.users || usersData;
            const foundUser = Array.isArray(usersList) ? usersList.find(u => u.email === email) : null;
            if (foundUser) {
              userId = foundUser.id;
            }
          }

          if (userId) {
            const updateRes = await fetch(`http://supabase-auth:9999/admin/users/${userId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'apikey': adminKey,
                'Authorization': `Bearer ${adminKey}`
              },
              body: JSON.stringify({ password: password })
            });

            if (!updateRes.ok) {
              const updateText = await updateRes.text();
              console.log("Supabase Admin Update Error:", updateRes.status, updateText);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "server_error", error_description: "Kunde inte synka lösenord mot Supabase Admin" }));
            }
          } else {
            const createRes = await fetch(`http://supabase-auth:9999/admin/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': adminKey,
                'Authorization': `Bearer ${adminKey}`
              },
              body: JSON.stringify({
                email: email,
                password: password,
                email_confirm: true
              })
            });

            if (!createRes.ok) {
              const createText = await createRes.text();
              console.log("Supabase Admin Create Status:", createRes.status, createText);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: "server_error", error_description: "Kunde inte skapa användare i Supabase Admin" }));
            }
          }

          // 2.5. Säkerställ att användaren har admin-roll i public.user_roles
          try {
            const roleRes = await fetch(`http://supabase-rest:3000/user_roles`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': adminKey,
                'Authorization': `Bearer ${adminKey}`,
                'Prefer': 'resolution=merge-duplicates' // Gör en UPSERT om raden redan finns
              },
              body: JSON.stringify({
                user_id: userId,
                role: 'admin'
              })
            });

            if (!roleRes.ok) {
              const roleText = await roleRes.text();
              console.log("Could not assign admin role in user_roles:", roleRes.status, roleText);
            } else {
              console.log("Admin role verified/assigned successfully for user:", userId);
            }
          } catch (roleErr) {
            console.error("Error assigning role:", roleErr);
          }

          // 3. Hämta GoTrue-session
          const gotrueRes = await fetch(`http://supabase-auth:9999/token${url.search}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': req.headers['apikey'] || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.ANON_KEY || ''
            },
            body: body,
          });

          const gotrueData = await gotrueRes.text();
          console.log("GoTrue Token Response Status:", gotrueRes.status, gotrueData);

          res.writeHead(gotrueRes.status, { 'Content-Type': 'application/json' });
          return res.end(gotrueData);
        }

        // Om det är någon annan grant_type, skicka vidare till GoTrue direkt
        const fallbackRes = await fetch(`http://supabase-auth:9999/token${url.search}`, {
          method: 'POST',
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
            'apikey': req.headers['apikey'] || ''
          },
          body: body,
        });
        const fallbackData = await fallbackRes.text();
        res.writeHead(fallbackRes.status, { 'Content-Type': 'application/json' });
        return res.end(fallbackData);

      } catch (err) {
        console.error("Auth Proxy Error:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "server_error", error_description: err.message }));
      }
    });
  }

  // 1. Statiska filer
  const ext = path.extname(pathname);
  if (STATIC_EXTENSIONS.includes(ext)) {
    const filePath = path.join(CLIENT_DIR, pathname);
    if (fs.existsSync(filePath)) {
      if (ext === '.png') res.setHeader('Content-Type', 'image/png');
      if (ext === '.js') res.setHeader('Content-Type', 'application/javascript');
      if (ext === '.css') res.setHeader('Content-Type', 'text/css');
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 2. SSR via din handler med Cloudflare-kontext mockad
  try {
    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.method !== 'GET' ? req : null,
    });

    const env = process.env;
    const ctx = {
      waitUntil: (promise) => Promise.resolve(promise),
      passThroughOnException: () => { },
    };

    const response = await handler.fetch(webRequest, env, ctx);

    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    res.writeHead(response.status);
    const body = await response.text();
    res.end(body);
  } catch (err) {
    console.error("SSR Error:", err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}).listen(80);

console.log("Server running on http://0.0.0.0:80");