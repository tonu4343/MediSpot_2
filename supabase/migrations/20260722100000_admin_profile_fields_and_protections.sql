-- Backfill: these pieces exist in supabase-schema.sql (the consolidated
-- reference) but were never captured as their own migration, so a fresh
-- database built only from this migrations/ folder would end up missing
-- account_status/postal_code/updated_at entirely, and would then fail
-- outright at 20260722150000_hire_invoices.sql's
-- "execute function public.set_updated_at()" (that function is only
-- ever defined in supabase-schema.sql, never in migrations) - this file
-- must run before that one. admin-employers.html/admin-seekers.html
-- already depend on all of this today.

-- Administrative account state and audit timestamp used by admin-seekers.html.
alter table public.seeker_profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended', 'withdrawn'));

alter table public.seeker_profiles
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists seeker_profiles_set_updated_at on public.seeker_profiles;
create trigger seeker_profiles_set_updated_at
before update on public.seeker_profiles
for each row execute function public.set_updated_at();

-- Administrative account state and profile metadata used by admin-employers.html.
alter table public.employer_profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended', 'withdrawn'));

alter table public.employer_profiles
  add column if not exists postal_code text;

alter table public.employer_profiles
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists employer_profiles_set_updated_at on public.employer_profiles;
create trigger employer_profiles_set_updated_at
before update on public.employer_profiles
for each row execute function public.set_updated_at();

-- Upgrade prevent_self_admin_escalation() (defined in 20260721090000_admin_role.sql)
-- to also block an admin from removing their own admin flag, not just
-- blocking non-admins from granting themselves one. create or replace
-- patches the existing function/trigger in place.
create or replace function public.prevent_self_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null then
    if not public.is_admin()
       or (auth.uid() = old.user_id and old.is_admin = true and new.is_admin = false) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists employer_profiles_guard_is_admin on public.employer_profiles;
create trigger employer_profiles_guard_is_admin
before update on public.employer_profiles
for each row execute function public.prevent_self_admin_escalation();

-- Admin update access (read-only admin policies already exist from
-- 20260721090000_admin_role.sql).
drop policy if exists "Admins update seeker profiles" on public.seeker_profiles;
create policy "Admins update seeker profiles"
on public.seeker_profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins update employer profiles" on public.employer_profiles;
create policy "Admins update employer profiles"
on public.employer_profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Only an admin may change account_status (a non-admin's own attempt to
-- edit it is silently reverted rather than erroring).
create or replace function public.protect_seeker_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and not public.is_admin() then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

drop trigger if exists seeker_profiles_protect_account_status on public.seeker_profiles;
create trigger seeker_profiles_protect_account_status
before update on public.seeker_profiles
for each row execute function public.protect_seeker_account_status();

create or replace function public.protect_employer_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and (auth.uid() = old.user_id or not public.is_admin()) then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

drop trigger if exists employer_profiles_protect_account_status on public.employer_profiles;
create trigger employer_profiles_protect_account_status
before update on public.employer_profiles
for each row execute function public.protect_employer_account_status();
