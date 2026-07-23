-- お知らせ (announcements): admin-authored, read by seekers (and,
-- schema-wise, employers once an employer-facing page consumes it -
-- only seeker-notices.html exists today). Unread tracking uses a single
-- per-user "last viewed" timestamp on the profile rather than a
-- per-notice read table, matching the scale this needs.

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'seeker', 'employer')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notices_created_at_idx on public.notices(created_at desc);

alter table public.notices enable row level security;

drop policy if exists "Authenticated users read relevant notices" on public.notices;
create policy "Authenticated users read relevant notices"
on public.notices
for select
to authenticated
using (
  audience = 'all'
  or (audience = 'seeker' and exists (select 1 from public.seeker_profiles where user_id = auth.uid()))
  or (audience = 'employer' and exists (select 1 from public.employer_profiles where user_id = auth.uid()))
  or public.is_admin()
);

drop policy if exists "Admins create notices" on public.notices;
create policy "Admins create notices"
on public.notices
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update notices" on public.notices;
create policy "Admins update notices"
on public.notices
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete notices" on public.notices;
create policy "Admins delete notices"
on public.notices
for delete
to authenticated
using (public.is_admin());

alter table public.seeker_profiles add column if not exists last_notices_read_at timestamptz;
