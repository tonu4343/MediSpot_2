create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('seeker', 'employer')),
  name text not null,
  email text not null,
  phone text,
  memo text,
  source_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_searches (
  id uuid primary key default gen_random_uuid(),
  profession jsonb,
  location jsonb,
  work_date text,
  employment_type text,
  source_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.seeker_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  birth_date date,
  phone text,
  license text,
  experience_years text,
  preferred_area text,
  preferred_style text,
  skills jsonb,
  pr text,
  source_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.employer_profiles (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  position text,
  facility_name text not null,
  facility_type text,
  staff_need text,
  phone text,
  email text not null,
  address text,
  recruit_styles jsonb,
  note text,
  source_path text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.job_searches enable row level security;
alter table public.seeker_profiles enable row level security;
alter table public.employer_profiles enable row level security;

create policy "Allow anonymous lead inserts"
on public.leads
for insert
to anon
with check (true);

create policy "Allow anonymous search inserts"
on public.job_searches
for insert
to anon
with check (true);

alter table public.seeker_profiles add column if not exists user_id uuid;

drop policy if exists "Allow anonymous seeker profile inserts" on public.seeker_profiles;
drop policy if exists "Allow seeker profile anonymous inserts" on public.seeker_profiles;
drop policy if exists "Allow seeker profile own inserts" on public.seeker_profiles;
drop policy if exists "Allow seeker profile own reads" on public.seeker_profiles;
drop policy if exists "Allow seeker profile own updates" on public.seeker_profiles;

create policy "Allow seeker profile anonymous inserts"
on public.seeker_profiles
for insert
to anon
with check (true);

create policy "Allow seeker profile own inserts"
on public.seeker_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow seeker profile own reads"
on public.seeker_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow seeker profile own updates"
on public.seeker_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.employer_profiles add column if not exists user_id uuid;

drop policy if exists "Allow anonymous employer profile inserts" on public.employer_profiles;
drop policy if exists "Allow employer profile anonymous inserts" on public.employer_profiles;
drop policy if exists "Allow employer profile own inserts" on public.employer_profiles;
drop policy if exists "Allow employer profile own reads" on public.employer_profiles;
drop policy if exists "Allow employer profile own updates" on public.employer_profiles;

create policy "Allow employer profile anonymous inserts"
on public.employer_profiles
for insert
to anon
with check (true);

create policy "Allow employer profile own inserts"
on public.employer_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow employer profile own reads"
on public.employer_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow employer profile own updates"
on public.employer_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);



-- Seeker registration + post-registration job matching (register-seeker.html / seeker-home.html)
create table if not exists public.seekers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  full_name text,
  email text,
  phone text,
  birthdate date,
  job_type text,
  experience text,
  location text,
  work_type text,
  skills text,
  pr_text text,
  role text default 'seeker',
  created_at timestamptz not null default now()
);

alter table public.seekers enable row level security;

create policy "Seekers manage own row"
on public.seekers
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid,
  title text not null,
  category text,
  type text,
  salary text,
  location text,
  work_date text,
  description text,
  requirements text,
  status text default 'open',
  created_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "Jobs public read"
on public.jobs
for select
to anon, authenticated
using (status = 'open');

-- Seeker resume / work history (seeker-resume.html)
create table if not exists public.seeker_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  seeker_profile_id uuid references public.seeker_profiles(id) on delete cascade,
  education jsonb default '[]'::jsonb,
  licenses jsonb default '[]'::jsonb,
  wishes text,
  work_summary text,
  work_history jsonb default '[]'::jsonb,
  skills_text text,
  pr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seeker_resumes enable row level security;

drop policy if exists "Allow seeker resume own inserts" on public.seeker_resumes;
drop policy if exists "Allow seeker resume own reads" on public.seeker_resumes;
drop policy if exists "Allow seeker resume own updates" on public.seeker_resumes;

create policy "Allow seeker resume own inserts"
on public.seeker_resumes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow seeker resume own reads"
on public.seeker_resumes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow seeker resume own updates"
on public.seeker_resumes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Seeker job applications (job-detail.html / seeker-applications.html)
create table if not exists public.seeker_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_id uuid,
  job_title text,
  facility_name text,
  status text not null default '応募済み',
  message text,
  created_at timestamptz not null default now()
);

alter table public.seeker_applications enable row level security;

drop policy if exists "Allow seeker application own inserts" on public.seeker_applications;
drop policy if exists "Allow seeker application own reads" on public.seeker_applications;
drop policy if exists "Allow seeker application own updates" on public.seeker_applications;

create policy "Allow seeker application own inserts"
on public.seeker_applications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow seeker application own reads"
on public.seeker_applications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow seeker application own updates"
on public.seeker_applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

