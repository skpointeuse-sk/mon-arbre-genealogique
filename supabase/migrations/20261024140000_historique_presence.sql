-- Phase 4 : historique des modifications, liste des membres réservée aux membres,
-- présence en temps réel sur un canal privé. Migration additive : aucune donnée supprimée.

-- 1. La liste des membres n'est plus lisible par un simple visiteur du lien public.
drop policy if exists members_select on public.tree_members;
create policy members_select on public.tree_members
  for select to authenticated
  using (public.tree_role(tree_id) is not null);

-- 2. Historique. Rempli uniquement par les déclencheurs ci-dessous (SECURITY DEFINER) :
--    le navigateur ne peut ni écrire, ni modifier, ni effacer une ligne.
create table if not exists public.tree_events (
  id bigint generated always as identity primary key,
  tree_id uuid not null references public.trees (id) on delete cascade,
  user_id uuid,
  at timestamptz not null default now(),
  kind text not null check (kind in ('ajout', 'modification', 'suppression')),
  target text not null check (target in ('personne', 'union', 'membre', 'arbre')),
  label text not null default '',
  fields text[] not null default '{}'
);
create index if not exists tree_events_tree_at on public.tree_events (tree_id, at desc);
alter table public.tree_events enable row level security;
revoke insert, update, delete on public.tree_events from anon, authenticated;

drop policy if exists events_select on public.tree_events;
create policy events_select on public.tree_events
  for select to authenticated
  using (public.tree_role(tree_id) is not null);

create or replace function public.log_event(t uuid, op text, target text, label text, fields text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Pendant la suppression d'un arbre entier, la cascade efface aussi ses fiches : rien à journaliser.
  if not exists (select 1 from public.trees where id = t) then
    return;
  end if;
  insert into public.tree_events (tree_id, user_id, kind, target, label, fields)
  values (
    t,
    (select auth.uid()),
    case op when 'INSERT' then 'ajout' when 'UPDATE' then 'modification' else 'suppression' end,
    target,
    coalesce(label, ''),
    coalesce(fields, '{}')
  );
end $$;
revoke execute on function public.log_event(uuid, text, text, text, text[]) from public, anon, authenticated;

-- Colonnes modifiées, sans les horodatages techniques.
create or replace function public.changed_fields(o jsonb, n jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(e.key order by e.key), '{}')
  from jsonb_each(n) e
  where e.value is distinct from (o -> e.key) and e.key not in ('updated_at', 'created_at');
$$;

create or replace function public.log_people()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
  f text[] := '{}';
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_op = 'UPDATE' then
    f := public.changed_fields(to_jsonb(old), to_jsonb(new));
    if f = '{}' then return null; end if;
  end if;
  perform public.log_event(r.tree_id, tg_op, 'personne', trim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), f);
  return null;
end $$;

create or replace function public.log_unions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
  f text[] := '{}';
  names text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_op = 'UPDATE' then
    f := public.changed_fields(to_jsonb(old), to_jsonb(new));
    if f = '{}' then return null; end if;
  end if;
  select string_agg(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ' et ')
    into names
    from public.people p
    where p.id in (r.person_a, r.person_b);
  perform public.log_event(r.tree_id, tg_op, 'union', names, f);
  return null;
end $$;

create or replace function public.log_members()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
  who text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_op = 'UPDATE' and old.role is not distinct from new.role then return null; end if;
  select coalesce(nullif(display_name, ''), email) into who from public.profiles where id = r.user_id;
  perform public.log_event(r.tree_id, tg_op, 'membre', coalesce(who, ''), array[r.role]);
  return null;
end $$;

create or replace function public.log_trees()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  f text[];
begin
  f := public.changed_fields(to_jsonb(old), to_jsonb(new));
  if f = '{}' then return null; end if;
  perform public.log_event(new.id, 'UPDATE', 'arbre', new.title, f);
  return null;
end $$;

revoke execute on function public.log_people() from public, anon, authenticated;
revoke execute on function public.log_unions() from public, anon, authenticated;
revoke execute on function public.log_members() from public, anon, authenticated;
revoke execute on function public.log_trees() from public, anon, authenticated;

drop trigger if exists people_log on public.people;
create trigger people_log after insert or update or delete on public.people
  for each row execute function public.log_people();
drop trigger if exists unions_log on public.unions;
create trigger unions_log after insert or update or delete on public.unions
  for each row execute function public.log_unions();
drop trigger if exists members_log on public.tree_members;
create trigger members_log after insert or update or delete on public.tree_members
  for each row execute function public.log_members();
drop trigger if exists trees_log on public.trees;
create trigger trees_log after update on public.trees
  for each row execute function public.log_trees();

-- 3. Présence : canal privé « arbre:<id> », ouvert seulement aux membres connectés de l'arbre.
create or replace function public.topic_tree()
returns uuid language plpgsql stable set search_path = '' as $$
begin
  if (select realtime.topic()) like 'arbre:%' then
    return substr((select realtime.topic()), 7)::uuid;
  end if;
  return null;
exception when invalid_text_representation then
  return null;
end $$;

drop policy if exists presence_read on realtime.messages;
create policy presence_read on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'presence' and public.tree_role(public.topic_tree()) is not null);
drop policy if exists presence_write on realtime.messages;
create policy presence_write on realtime.messages
  for insert to authenticated
  with check (realtime.messages.extension = 'presence' and public.tree_role(public.topic_tree()) is not null);
