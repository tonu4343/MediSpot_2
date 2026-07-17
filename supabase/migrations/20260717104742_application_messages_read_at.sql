-- Unread message tracking for application_messages
alter table public.application_messages add column if not exists read_at timestamptz;

drop policy if exists "Participants mark messages read" on public.application_messages;

create policy "Participants mark messages read"
on public.application_messages
for update
to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.seeker_applications a
    where a.id = application_id
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.seeker_applications a
    where a.id = application_id
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  )
);
