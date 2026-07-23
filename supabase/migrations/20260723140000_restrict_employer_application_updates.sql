-- "Allow employer application updates" only restricted which ROW an
-- employer could update (their own, while active); WITH CHECK re-checks
-- the same row-ownership condition, not which columns changed. Nothing
-- stopped an employer from calling .update({ seeker_name: '...',
-- seeker_email: '...', message: '...', job_title: '...' }) and rewriting
-- applicant-authored fields on their own application row. The only real
-- callers (application-chat.html, employer-applications.html,
-- employer-applicant.html) only ever set status, interview_at, and
-- work_start_at. Replace the open UPDATE policy with a locked-down
-- function that only ever touches those three columns, and drop
-- client-side UPDATE access to the table for employers entirely.

drop policy if exists "Allow employer application updates" on public.seeker_applications;

create or replace function public.employer_update_application_status(
  p_application_id uuid,
  p_status text,
  p_interview_at timestamptz default null,
  p_work_start_at date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.seeker_applications
    where id = p_application_id
      and employer_id = auth.uid()
  ) then
    return;
  end if;

  if not public.is_employer_active(auth.uid()) then
    return;
  end if;

  if p_status not in (
    'applied', 'screening', 'interview_scheduling', 'interview_scheduled',
    'offer_pending', 'hired', 'work_scheduled', 'working', 'completed',
    'rejected', 'cancelled'
  ) then
    raise exception 'invalid status value: %', p_status;
  end if;

  update public.seeker_applications
  set status = p_status,
      interview_at = coalesce(p_interview_at, interview_at),
      work_start_at = coalesce(p_work_start_at, work_start_at)
  where id = p_application_id;
end;
$$;

grant execute on function public.employer_update_application_status(uuid, text, timestamptz, date) to authenticated;
