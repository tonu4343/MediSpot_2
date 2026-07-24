-- Drop the interview-date-coordination and work-start-date-scheduling
-- sub-steps from the hire pipeline (employer feedback: neither the
-- interview date nor the work start date needs to be tracked in-app).
-- New pipeline: applied -> screening -> offer_pending -> hired ->
-- working -> completed (rejected / withdrawn / cancelled unchanged).

update public.seeker_applications set status = 'screening' where status in ('interview_scheduling', 'interview_scheduled');
update public.seeker_applications set status = 'hired' where status = 'work_scheduled';

alter table public.seeker_applications drop column if exists interview_at;
alter table public.seeker_applications drop column if exists work_start_at;

drop function if exists public.employer_update_application_status(uuid, text, timestamptz, date);

create or replace function public.employer_update_application_status(
  p_application_id uuid,
  p_status text
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
    'applied', 'screening', 'offer_pending', 'hired', 'working', 'completed',
    'rejected', 'cancelled'
  ) then
    raise exception 'invalid status value: %', p_status;
  end if;

  update public.seeker_applications
  set status = p_status
  where id = p_application_id;
end;
$$;

grant execute on function public.employer_update_application_status(uuid, text) to authenticated;
