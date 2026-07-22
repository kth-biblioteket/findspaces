# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Bygg-tid variabler – dessa är PUBLIKA nycklar avsedda att exponeras i
# webbläsaren. De är inte hemligheter och bäddas in i JS-bundeln av Vite.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Kopiera package-filer och installera beroenden
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Kopiera källkod och bygg
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Kopiera bara det som behövs för att köra appen
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 80

COPY server-adapter.js .

CMD ["node", "server-adapter.js"]