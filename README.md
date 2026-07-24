# Find spaces

Detta är ett verktyg för att söka platser på biblioteket.

## Install

- Skapa lokal folder (sudo mkdir findspaces)
- Skapa docker-composer.yml och uppdatera från repot
- Skapa .env med allt som behövs
- Skapa och kör prepare.sh (chmod +x prepare.sh)

Github actions fix:

- name: Build and push Docker image 
        uses: docker/build-push-action@v3
        with:
          context: .
          push: true 
          tags: ${{ steps.meta.outputs.tags }} 
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            VITE_SUPABASE_URL=https://findspaces-ref.lib.kth.se/api
            VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_60Bb-qHXzLofE7g3QT2EN0_A1pWxHEy
            VITE_SUPABASE_PROJECT_ID=lobuiecijreciwgkkcml

### Skapa användare

curl -X POST 'https://findspaces-ref.lib.kth.se/api/auth/v1/signup' \
  -H "apikey: xxxx" \
  -H "Authorization: Bearer xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tholind@kth.se",
    "password": "xxxxxx",
    "email_confirm": false
  }'

### Uppdatera från lovable-repo
- git remote add upstream https://github.com/sofieseo/kth-rummet-hitta.git
- git fetch upstream
- git checkout ref
- git merge upstream/main --allow-unrelated-histories
- Hantera eventuella konflikter
- Hantera package-lock
  - npm install

### Licens / License

Copyright (C) 2026 KTH Biblioteket

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.