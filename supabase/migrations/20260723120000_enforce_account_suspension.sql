-- account_status ('suspended') was only ever checked by the admin UI that
-- sets it. Login didn't check it, and RLS on jobs/applications/messages
-- only checked ownership (auth.uid() = ...), so a suspended seeker or
-- employer with a still-valid session could keep posting jobs, applying,
-- and messaging. Add active-status gates to the write-path policies so
-- suspension is enforced at the database layer regardless of client code
-- or an already-open session.

create or replace function public.is_seeker_active(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select account_status = 'active' from public.seeker_profiles where user_id = uid),
    false
  );
$$;

create or replace function public.is_employer_active(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select account_status = 'active' from public.employer_profiles where user_id = uid),
    false
  );
$$;

-- Jobs: a suspended employer can't post new jobs or edit existing ones.
drop policy if exists "Employers create own jobs" on public.jobs;
create policy "Employers create own jobs"
on public.jobs
for insert
to authenticated
with check (auth.uid() = employer_id and public.is_employer_active(auth.uid()));

drop policy if exists "Employers update own jobs" on public.jobs;
create policy "Employers update own jobs"
on public.jobs
for update
to authenticated
using (auth.uid() = employer_id)
with check (auth.uid() = employer_id and public.is_employer_active(auth.uid()));

-- Applications: a suspended seeker can't submit new applications; a
-- suspended employer can't advance an application's status.
drop policy if exists "Allow seeker application own inserts" on public.seeker_applications;
create policy "Allow seeker application own inserts"
on public.seeker_applications
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_seeker_active(auth.uid())
  and exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.employer_id = employer_id
      and j.status = 'open'
  )
);

drop policy if exists "Allow employer application updates" on public.seeker_applications;
create policy "Allow employer application updates"
on public.seeker_applications
for update
to authenticated
using (auth.uid() = employer_id)
with check (auth.uid() = employer_id and public.is_employer_active(auth.uid()));

-- Messages: a suspended seeker or employer can't send new chat messages
-- (existing history stays visible via the unchanged read policy).
drop policy if exists "Participants send application messages" on public.application_messages;
create policy "Participants send application messages"
on public.application_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (public.is_seeker_active(auth.uid()) or public.is_employer_active(auth.uid()))
  and exists (
    select 1 from public.seeker_applications a
    where a.id = application_id
      and a.status not in ('applied', 'rejected', 'withdrawn', 'cancelled')
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  )
);
