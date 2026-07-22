-- Extend the hire lifecycle past 採用決定 with 勤務開始 (work started) and
-- 完了 (completed), set by the employer from application-chat.html. Keep
-- chat open through both new stages instead of locking it at 採用決定.
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
      and a.status in ('選考中', '採用決定', '勤務開始', '完了')
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  )
);
