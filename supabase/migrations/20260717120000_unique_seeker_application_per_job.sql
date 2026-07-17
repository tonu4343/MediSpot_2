-- Prevent a seeker from applying to the same job twice
-- The app already checks for an existing application before inserting, but that
-- check-then-insert is not atomic (e.g. two browser tabs submitting at once),
-- so enforce it at the database level too.

-- Keep only the earliest application per (user_id, job_id) if duplicates already exist.
delete from public.seeker_applications a
using public.seeker_applications b
where a.user_id = b.user_id
  and a.job_id = b.job_id
  and a.job_id is not null
  and a.user_id is not null
  and (a.created_at, a.id) > (b.created_at, b.id);

create unique index if not exists seeker_applications_user_job_unique
on public.seeker_applications (user_id, job_id)
where user_id is not null and job_id is not null;
