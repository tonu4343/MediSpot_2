-- Backing columns for seeker-settings.html's 通知設定 (notification
-- toggles) and 公開・プライバシー設定 (profile visibility).
alter table public.seeker_profiles
  add column if not exists notification_preferences jsonb not null default
    '{"new_jobs":true,"messages":true,"interviews":true,"application_status":true,"email":true}'::jsonb;

alter table public.seeker_profiles
  add column if not exists profile_visibility text not null default '応募した求人者のみ';

-- 'withdrawn' has been a valid account_status value (and already
-- correctly blocks login with its own message) since the suspension
-- work, but nothing could ever actually reach it: both protection
-- triggers block every non-admin change to account_status, including a
-- user closing their own account. seeker-settings.html's アカウントを削除する
-- needs a genuine self-service path. Carve out exactly one exception in
-- each trigger: the row's own owner may flip their own status from
-- active to withdrawn (and nothing else - not to/from suspended, and
-- not un-withdrawing themselves).
create or replace function public.protect_seeker_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and not public.is_admin()
     and not (auth.uid() = old.user_id and old.account_status = 'active' and new.account_status = 'withdrawn') then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

create or replace function public.protect_employer_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and (auth.uid() = old.user_id or not public.is_admin())
     and not (auth.uid() = old.user_id and old.account_status = 'active' and new.account_status = 'withdrawn') then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;
