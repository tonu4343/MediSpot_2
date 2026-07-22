-- Replace the 5-value 応募済み/選考中/採用決定/勤務開始/完了 pipeline with a
-- richer 12-stage, English-keyed pipeline:
-- applied -> screening -> interview_scheduling -> interview_scheduled ->
-- offer_pending -> hired -> work_scheduled -> working -> completed
-- (with rejected / withdrawn / cancelled as branch exits).

alter table public.seeker_applications add column if not exists interview_at timestamptz;
alter table public.seeker_applications add column if not exists work_start_at date;

-- Map existing rows onto the new pipeline's values. Old 勤務開始 meant
-- "currently working" (there was no separate "scheduled but not started"
-- concept), so it maps to 'working', not the new 'work_scheduled' stage.
update public.seeker_applications set status = 'applied' where status = '応募済み';
update public.seeker_applications set status = 'screening' where status = '選考中';
update public.seeker_applications set status = 'hired' where status = '採用決定';
update public.seeker_applications set status = 'working' where status = '勤務開始';
update public.seeker_applications set status = 'completed' where status = '完了';

alter table public.seeker_applications alter column status set default 'applied';

-- Invoice creation now fires on the transition into 'hired' (was '採用決定').
create or replace function public.create_hire_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'hired' and old.status is distinct from 'hired' then
    insert into public.hire_invoices (application_id, employer_id, job_id, job_title, facility_name, seeker_name)
    values (new.id, new.employer_id, new.job_id, new.job_title, new.facility_name, new.seeker_name)
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$$;

-- Chat is closed before screening starts and after any terminal exit
-- (rejected/withdrawn/cancelled), open at every stage in between. A
-- blocklist here (vs. the old 4-value allowlist) means future pipeline
-- stages don't silently lose chat access.
drop policy if exists "Participants send application messages" on public.application_messages;

create policy "Participants send application messages"
on public.application_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.seeker_applications a
    where a.id = application_id
      and a.status not in ('applied', 'rejected', 'withdrawn', 'cancelled')
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  )
);
