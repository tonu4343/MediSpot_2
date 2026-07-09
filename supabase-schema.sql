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

create policy "Allow anonymous seeker profile inserts"
on public.seeker_profiles
for insert
to anon
with check (true);

create policy "Allow anonymous employer profile inserts"
on public.employer_profiles
for insert
to anon
with check (true);


alter table public.seeker_profiles add column if not exists user_id uuid;
