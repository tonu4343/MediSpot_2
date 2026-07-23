-- Backing column for employer-settings.html's 通知設定 (notification
-- toggles), mirroring the seeker_profiles.notification_preferences
-- column added for seeker-settings.html.
alter table public.employer_profiles
  add column if not exists notification_preferences jsonb not null default
    '{"new_applications":true,"messages":true,"hires":true,"payments":true,"email":true}'::jsonb;
