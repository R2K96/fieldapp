-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FieldApp · Supabase Schema                                  ║
-- ║  Ausführen in: Supabase → SQL Editor → New Query             ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── KUNDEN ────────────────────────────────────────────────────
create table if not exists kunden (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table kunden enable row level security;
drop policy if exists "Users own kunden" on kunden;
create policy "Users own kunden" on kunden
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── AUFTRÄGE ──────────────────────────────────────────────────
create table if not exists auftraege (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table auftraege enable row level security;
drop policy if exists "Users own auftraege" on auftraege;
create policy "Users own auftraege" on auftraege
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── DOCS (Nachtermin-Dokumentation) ──────────────────────────
create table if not exists docs (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table docs enable row level security;
drop policy if exists "Users own docs" on docs;
create policy "Users own docs" on docs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── RECHNUNGEN ────────────────────────────────────────────────
create table if not exists rechnungen (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table rechnungen enable row level security;
drop policy if exists "Users own rechnungen" on rechnungen;
create policy "Users own rechnungen" on rechnungen
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── WOCHENPLAN ────────────────────────────────────────────────
create table if not exists wochenplan (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table wochenplan enable row level security;
drop policy if exists "Users own wochenplan" on wochenplan;
create policy "Users own wochenplan" on wochenplan
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── FAHRTENBUCH ───────────────────────────────────────────────
create table if not exists fahrtenbuch (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table fahrtenbuch enable row level security;
drop policy if exists "Users own fahrtenbuch" on fahrtenbuch;
create policy "Users own fahrtenbuch" on fahrtenbuch
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── EINSTELLUNGEN ─────────────────────────────────────────────
create table if not exists einstellungen (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table einstellungen enable row level security;
drop policy if exists "Users own einstellungen" on einstellungen;
create policy "Users own einstellungen" on einstellungen
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── ZEITERFASSUNG ─────────────────────────────────────────────
create table if not exists zeiterfassung (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table zeiterfassung enable row level security;
drop policy if exists "Users own zeiterfassung" on zeiterfassung;
create policy "Users own zeiterfassung" on zeiterfassung
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── MATERIALIEN (Materialkatalog) ────────────────────────────
create table if not exists materialien (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table materialien enable row level security;
drop policy if exists "Users own materialien" on materialien;
create policy "Users own materialien" on materialien
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── ANGEBOTE ──────────────────────────────────────────────────
create table if not exists angebote (
  id         text        primary key,
  user_id    uuid        references auth.users not null default auth.uid(),
  data       jsonb       not null default '{}',
  created_at timestamptz default now()
);
alter table angebote enable row level security;
drop policy if exists "Users own angebote" on angebote;
create policy "Users own angebote" on angebote
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── STORAGE BUCKET: fieldapp-fotos ────────────────────────────
-- Im Supabase Dashboard: Storage → New Bucket → Name: "fieldapp-fotos" → Public: OFF
-- Dann diese RLS-Policies für den Bucket ausführen:

insert into storage.buckets (id, name, public)
values ('fieldapp-fotos', 'fieldapp-fotos', false)
on conflict (id) do nothing;

drop policy if exists "Users upload own fotos" on storage.objects;
create policy "Users upload own fotos" on storage.objects
  for insert with check (
    bucket_id = 'fieldapp-fotos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users read own fotos" on storage.objects;
create policy "Users read own fotos" on storage.objects
  for select using (
    bucket_id = 'fieldapp-fotos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own fotos" on storage.objects;
create policy "Users delete own fotos" on storage.objects
  for delete using (
    bucket_id = 'fieldapp-fotos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── FERTIG ────────────────────────────────────────────────────
-- 10 Tabellen + Storage Bucket mit Row Level Security.
-- Jeder Nutzer sieht und bearbeitet nur seine eigenen Daten.
