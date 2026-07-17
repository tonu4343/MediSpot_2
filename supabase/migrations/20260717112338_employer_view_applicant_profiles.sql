-- Let an employer view the seeker_profiles / seeker_resumes rows of applicants
-- who applied to a job posted by that employer (seeker_applications.employer_id),
-- without exposing unrelated seekers' profiles.

drop policy if exists "Employers view applicant seeker profiles" on public.seeker_profiles;

create policy "Employers view applicant seeker profiles"
on public.seeker_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.seeker_applications a
    where a.user_id = seeker_profiles.user_id
      and a.employer_id = auth.uid()
  )
);

drop policy if exists "Employers view applicant seeker resumes" on public.seeker_resumes;

create policy "Employers view applicant seeker resumes"
on public.seeker_resumes
for select
to authenticated
using (
  exists (
    select 1 from public.seeker_applications a
    where a.user_id = seeker_resumes.user_id
      and a.employer_id = auth.uid()
  )
);
