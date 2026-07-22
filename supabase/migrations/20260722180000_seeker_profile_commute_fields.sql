-- Fields commonly asked on Japanese healthcare job-matching platforms that
-- were missing from the seeker profile: nearest station, commute method,
-- and current employment status (used by seeker-profile.html).
alter table public.seeker_profiles add column if not exists nearest_station text;
alter table public.seeker_profiles add column if not exists commute_method text;
alter table public.seeker_profiles add column if not exists employment_status text;
