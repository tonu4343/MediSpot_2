-- Operational administrator role: a boolean flag on employer_profiles,
-- manually granted, with read-all access to seeker/employer profiles.

alter table public.employer_profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.employer_profiles
    where user_id = auth.uid() and is_admin = true
  );
$$;

create or replace function public.prevent_self_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists employer_profiles_guard_is_admin on public.employer_profiles;
create trigger employer_profiles_guard_is_admin
before update on public.employer_profiles
for each row execute function public.prevent_self_admin_escalation();

drop policy if exists "Admins read all seeker profiles" on public.seeker_profiles;
create policy "Admins read all seeker profiles"
on public.seeker_profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read all employer profiles" on public.employer_profiles;
create policy "Admins read all employer profiles"
on public.employer_profiles for select to authenticated
using (public.is_admin());
