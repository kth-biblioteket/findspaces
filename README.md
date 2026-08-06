# Find spaces

Detta är ett verktyg för att söka platser på biblioteket.

## Install

- Skapa lokal folder (sudo mkdir findspaces)
- Skapa docker-composer.yml och uppdatera från repot
- Skapa .env med allt som behövs
- Skapa och kör prepare.sh (sudo chmod +x prepare.sh)
- Kopiera innehållet i kong.yml från repo till ./volumes/api/kong.yml
- Skapa eventuellt record i dns för domän(findspaces.lib.kth.se)
  - Via https://sysadm.lan.kth.se

## Skapa databas/tabeller
### Logga in på pgadmin
- registrera server
 - supabase-db/5432
 - user: postgres
 - password: xxxx(env POSTGRES_PASSWORD)
- Kör schema.sql
### Importera eventuellt data från Lovable
 - Sctript skapade av lovable(prompta att ta ut tabellerna som rader med INSERT)
 - Bilder via SQL + t ex node-script
  - Bildlista spaces
   ```
      select image_url as val from public.spaces where image_url is not null
      union
      select unnest(images) as val from public.spaces where images is not null
   ```
  - Bildlista filter-icons
  ```
    select icon_url as val from public.filter_options where icon_url is not null
  ```
  - kör node-script med dessa respektive listor som hämtar bilder från lovable-buckets och sedan anropar API och laddar upp bilderna i den lokala isntallationen
  
  - Uppdatera DB:

```mysql

UPDATE public.spaces
    SET image_url = replace(
      image_url,
      'https://lobuiecijreciwgkkcml.supabase.co/storage/v1',
      'https://findspaces-ref.lib.kth.se/api/storage/v1'
    )
    WHERE image_url LIKE 'https://lobuiecijreciwgkkcml.supabase.co%';

    UPDATE public.spaces
    SET images = (
      SELECT array_agg(
        replace(elem, 'https://lobuiecijreciwgkkcml.supabase.co/storage/v1', 'https://findspaces-ref.lib.kth.se/api/storage/v1')
      )
      FROM unnest(images) AS elem
    )
    WHERE images IS NOT NULL AND array_length(images, 1) > 0;

  update public.filter_options
    set icon_url = replace(
      icon_url,
      'https://lobuiecijreciwgkkcml.supabase.co/storage/v1',
      'https://findspaces-ref.lib.kth.se/api/storage/v1'
    )
    where icon_url like 'https://lobuiecijreciwgkkcml.supabase.co%';

    update public.filter_options
    set default_icon = replace(
      default_icon,
      'https://lobuiecijreciwgkkcml.supabase.co/storage/v1',
      'https://findspaces-ref.lib.kth.se/api/storage/v1'
    )
    where default_icon like 'https://lobuiecijreciwgkkcml.supabase.co%';

  update public.app_settings
    set value = replace(
      value,
      'https://lobuiecijreciwgkkcml.supabase.co/storage/v1',
      'https://findspaces-ref.lib.kth.se/api/storage/v1'
    )
    where key = 'capacity_icon_url';
```


Github actions yml-fix
- Måste ha build args

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
            
- server-adapter.js används för att köra själva appen och dess server-komponeneter i en node-container

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



### Uppdatera nya versioner från lovable-repo
- git remote add upstream https://github.com/sofieseo/kth-rummet-hitta.git
- git fetch upstream
- git checkout ref
- git merge upstream/main --allow-unrelated-histories
- Hantera eventuella konflikter
  - git commit
- Hantera eventuell ändring i package.json -- package-lock
  - npm install
  - npm install --legacy-peer-deps
- Hantera anpassningar för eventuella förändringar.
 - t ex ny folder vid bygge
- Hantera eventuella databasuppdateringar
 - Tabeller, fält etc

- git chekout main
- git merge. ref 

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