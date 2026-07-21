-- Extend admin read access to jobs and applications, plus a bounded
-- moderation ability (open/close any job posting). Uses public.is_admin()
-- from the previous migration.

drop policy if exists "Admins read all jobs" on public.jobs;
create policy "Admins read all jobs"
on public.jobs for select to authenticated
using (public.is_admin());

drop policy if exists "Admins update all jobs" on public.jobs;
create policy "Admins update all jobs"
on public.jobs for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read all applications" on public.seeker_applications;
create policy "Admins read all applications"
on public.seeker_applications for select to authenticated
using (public.is_admin());
