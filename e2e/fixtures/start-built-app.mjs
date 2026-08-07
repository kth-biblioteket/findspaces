import { spawn } from "node:child_process";

let child;
let stopping = false;

function stopChild(signal) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  stopChild(signal);

  const forceStop = setTimeout(() => {
    stopChild("SIGKILL");
    process.exit(0);
  }, 1_000);
  forceStop.unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function run(command, args) {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, {
      detached: true,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      child = undefined;
      if (stopping) {
        process.exit(0);
      } else if (signal) {
        reject(new Error(`${command} exited after ${signal}`));
      } else {
        resolve(code ?? 1);
      }
    });
  });
}

const buildCode = await run("npm", ["run", "build"]);
if (buildCode !== 0) process.exit(buildCode);

const appCode = await run("npx", [
  "wrangler",
  "--cwd",
  ".output",
  "dev",
  "--port",
  "8787",
  "--var",
  "SUPABASE_URL:http://127.0.0.1:8080",
  "--var",
  "SUPABASE_PUBLISHABLE_KEY:e2e-publishable-key",
  "--var",
  "GROUP_ROOM_AVAILABILITY_API_BASE:http://127.0.0.1:8080/bookingsystem/v1/roomsavailability/grouprooms/1",
]);
process.exit(appCode);
