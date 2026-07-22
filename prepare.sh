#!/bin/bash
mkdir -p volumes/api
curl -o volumes/api/kong.yml \
  https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/api/kong.yml

mkdir -p volumes/db/data volumes/db/init volumes/storage

curl -o volumes/api/kong-entrypoint.sh \
  https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/api/kong-entrypoint.sh

chmod +x volumes/api/kong-entrypoint.sh

# DB-skript
curl -o volumes/db/init/99-realtime.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/realtime.sql
curl -o volumes/db/init/98-webhooks.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/webhooks.sql
curl -o volumes/db/init/99-roles.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/roles.sql
curl -o volumes/db/init/99-jwt.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/jwt.sql
curl -o volumes/db/init/97-_supabase.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/_supabase.sql
curl -o volumes/db/init/99-logs.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/logs.sql
curl -o volumes/db/init/99-pooler.sql https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db/pooler.sql

#cat supabase/migrations/*.sql > ./volumes/db/init/999-all-migrations.sql

##for f in supabase/migrations/*.sql; do cp "$f" "./volumes/db/init/999-$(basename "$f")"; done

# Logs
mkdir -p volumes/logs
curl -o volumes/logs/vector.yml https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/logs/vector.yml

# Pooler
mkdir -p volumes/pooler
curl -o volumes/pooler/pooler.exs https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/pooler/pooler.exs

# Functions
mkdir -p volumes/functions/main
curl -o volumes/functions/main/index.ts https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/functions/main/index.ts

mkdir -p volumes/pgadmin

sudo chown -R 5050:5050 ./volumes/pgadmin