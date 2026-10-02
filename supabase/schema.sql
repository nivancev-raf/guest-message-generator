-- Guest Message Generator - database schema (Supabase / Postgres)
-- Run once in Supabase Dashboard -> SQL Editor.
-- This file contains NO apartment data. Data is inserted separately and is never committed.

-- ---------------------------------------------------------------------------
-- Apartments: one row per apartment, owned by a single user
-- ---------------------------------------------------------------------------
create table if not exists public.apartments (
    id               uuid primary key default gen_random_uuid(),
    owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name             text not null,          -- label shown in the dropdown
    building         text,
    address          text,
    apartment_number text,
    entrance         text,
    floor            text,
    parking_spot     text,
    garage_level     text,
    sort_order       integer not null default 0,
    -- Custom message templates per language:
    -- { "sr": { "reservation": "...", "reservation_no_transport": "...", "garage": "..." }, "en": { ... } }
    -- Missing keys fall back to the default templates in templates.js
    templates        jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists apartments_owner_idx on public.apartments (owner_id, sort_order);

-- ---------------------------------------------------------------------------
-- Profiles: display name ("Hello {name}!") and default apartment per user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id                   uuid primary key references auth.users (id) on delete cascade,
    display_name         text not null,
    default_apartment_id uuid references public.apartments (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists apartments_set_updated_at on public.apartments;
create trigger apartments_set_updated_at
    before update on public.apartments
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every user sees and edits only their own rows
-- ---------------------------------------------------------------------------
alter table public.apartments enable row level security;
alter table public.profiles   enable row level security;

drop policy if exists "apartments_select_own" on public.apartments;
drop policy if exists "apartments_insert_own" on public.apartments;
drop policy if exists "apartments_update_own" on public.apartments;
drop policy if exists "apartments_delete_own" on public.apartments;

create policy "apartments_select_own" on public.apartments
    for select to authenticated using (owner_id = auth.uid());
create policy "apartments_insert_own" on public.apartments
    for insert to authenticated with check (owner_id = auth.uid());
create policy "apartments_update_own" on public.apartments
    for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "apartments_delete_own" on public.apartments
    for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
    for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- API access (needed when "Automatically expose new tables" is disabled).
-- RLS above still limits every user to their own rows.
-- anon only gets SELECT for the keep-alive ping; with no anon policy it always sees 0 rows.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.apartments to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.apartments to anon;
