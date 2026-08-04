
create or replace function public.slugify_filter_value(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          lower(translate(coalesce(p, ''), 'åäöéèüÅÄÖÉÈÜ', 'aaoeeuaaoeeu')),
          '[^a-z0-9]+', '_', 'g'
        ),
        '^_+|_+$', '', 'g'
      ),
      ''
    ),
    'option'
  )
$$;

create or replace function public.set_filter_option_value_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  i int := 1;
begin
  if new.value_key is null or btrim(new.value_key) = '' then
    base := public.slugify_filter_value(new.label);
    candidate := base;
    while exists (
      select 1 from public.filter_options
      where category = new.category
        and value_key = candidate
        and id is distinct from new.id
    ) loop
      i := i + 1;
      candidate := base || '_' || i;
    end loop;
    new.value_key := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists filter_options_set_value_key on public.filter_options;
create trigger filter_options_set_value_key
before insert on public.filter_options
for each row execute function public.set_filter_option_value_key();

-- Backfill stable keys for every existing option that lacks one.
do $$
declare
  r record;
  base text;
  candidate text;
  i int;
begin
  for r in select id, category, label from public.filter_options
           where value_key is null or btrim(value_key) = ''
           order by category, sort_order
  loop
    base := public.slugify_filter_value(r.label);
    candidate := base;
    i := 1;
    while exists (
      select 1 from public.filter_options
      where category = r.category and value_key = candidate
    ) loop
      i := i + 1;
      candidate := base || '_' || i;
    end loop;
    update public.filter_options set value_key = candidate where id = r.id;
  end loop;
end $$;

create unique index if not exists filter_options_category_value_key_uidx
  on public.filter_options (category, value_key);
