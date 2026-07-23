-- "Participants mark messages read" only restricted which ROWS a
-- non-sender participant could update (via USING/WITH CHECK), not which
-- COLUMNS. Nothing stopped a recipient from calling
-- .update({ body: '...' }) on someone else's message and rewriting the
-- chat log, since RLS has no per-column granularity. The only real
-- caller (application-chat.html) only ever sets read_at. Replace the
-- open UPDATE policy with a locked-down function that touches read_at
-- only, and drop client-side UPDATE access to the table entirely.

drop policy if exists "Participants mark messages read" on public.application_messages;

create or replace function public.mark_messages_read(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.seeker_applications a
    where a.id = p_application_id
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  ) then
    return;
  end if;

  update public.application_messages
  set read_at = now()
  where application_id = p_application_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

grant execute on function public.mark_messages_read(uuid) to authenticated;
