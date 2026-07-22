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

drop policy if exists "Allow anonymous lead inserts" on public.leads;
drop policy if exists "Allow anonymous search inserts" on public.job_searches;

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

-- Administrative account state and audit timestamp used by admin-seekers.html.
alter table public.seeker_profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended', 'withdrawn'));

alter table public.seeker_profiles
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists seeker_profiles_set_updated_at on public.seeker_profiles;
create trigger seeker_profiles_set_updated_at
before update on public.seeker_profiles
for each row execute function public.set_updated_at();

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

-- Administrative account state and profile metadata used by admin-employers.html.
alter table public.employer_profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended', 'withdrawn'));

alter table public.employer_profiles
  add column if not exists postal_code text;

alter table public.employer_profiles
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists employer_profiles_set_updated_at on public.employer_profiles;
create trigger employer_profiles_set_updated_at
before update on public.employer_profiles
for each row execute function public.set_updated_at();

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

drop policy if exists "Seekers manage own row" on public.seekers;

create policy "Seekers manage own row"
on public.seekers
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid,
  facility_name text,
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

drop policy if exists "Jobs public read" on public.jobs;
drop policy if exists "Employers read own jobs" on public.jobs;
drop policy if exists "Employers create own jobs" on public.jobs;
drop policy if exists "Employers update own jobs" on public.jobs;

create policy "Jobs public read"
on public.jobs
for select
to anon, authenticated
using (status = 'open');

create policy "Employers read own jobs"
on public.jobs
for select
to authenticated
using (auth.uid() = employer_id);

create policy "Employers create own jobs"
on public.jobs
for insert
to authenticated
with check (auth.uid() = employer_id);

create policy "Employers update own jobs"
on public.jobs
for update
to authenticated
using (auth.uid() = employer_id)
with check (auth.uid() = employer_id);

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
  employer_id uuid references auth.users(id) on delete cascade,
  job_id uuid,
  job_title text,
  facility_name text,
  seeker_name text,
  seeker_email text,
  seeker_profession text,
  status text not null default '応募済み',
  message text,
  created_at timestamptz not null default now()
);

alter table public.jobs add column if not exists facility_name text;

alter table public.seeker_applications add column if not exists employer_id uuid references auth.users(id) on delete cascade;
alter table public.seeker_applications add column if not exists seeker_name text;
alter table public.seeker_applications add column if not exists seeker_email text;
alter table public.seeker_applications add column if not exists seeker_profession text;

update public.seeker_applications a
set employer_id = j.employer_id,
    facility_name = coalesce(a.facility_name, j.facility_name)
from public.jobs j
where a.job_id = j.id
  and a.employer_id is null;

update public.seeker_applications a
set seeker_name = coalesce(a.seeker_name, p.name),
    seeker_email = coalesce(a.seeker_email, p.email),
    seeker_profession = coalesce(a.seeker_profession, p.license)
from public.seeker_profiles p
where a.user_id = p.user_id
  and (a.seeker_name is null or a.seeker_email is null or a.seeker_profession is null);

-- Prevent a seeker from applying to the same job twice (keep the earliest row if duplicates already exist)
delete from public.seeker_applications a
using public.seeker_applications b
where a.user_id = b.user_id
  and a.job_id = b.job_id
  and a.job_id is not null
  and a.user_id is not null
  and (a.created_at, a.id) > (b.created_at, b.id);

create unique index if not exists seeker_applications_user_job_unique
on public.seeker_applications (user_id, job_id)
where user_id is not null and job_id is not null;

alter table public.seeker_applications enable row level security;

drop policy if exists "Allow seeker application own inserts" on public.seeker_applications;
drop policy if exists "Allow seeker application own reads" on public.seeker_applications;
drop policy if exists "Allow seeker application own updates" on public.seeker_applications;
drop policy if exists "Allow employer application reads" on public.seeker_applications;
drop policy if exists "Allow employer application updates" on public.seeker_applications;

create policy "Allow seeker application own inserts"
on public.seeker_applications
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.employer_id = employer_id
      and j.status = 'open'
  )
);

create policy "Allow seeker application own reads"
on public.seeker_applications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow employer application reads"
on public.seeker_applications
for select
to authenticated
using (auth.uid() = employer_id);

create policy "Allow employer application updates"
on public.seeker_applications
for update
to authenticated
using (auth.uid() = employer_id)
with check (auth.uid() = employer_id);

-- Private application chat (application-chat.html)
create table if not exists public.application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.seeker_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists application_messages_application_created_idx on public.application_messages(application_id, created_at);
alter table public.application_messages enable row level security;

drop policy if exists "Participants read application messages" on public.application_messages;
drop policy if exists "Participants send application messages" on public.application_messages;

create policy "Participants read application messages"
on public.application_messages
for select
to authenticated
using (exists (
  select 1 from public.seeker_applications a
  where a.id = application_id
    and (a.user_id = auth.uid() or a.employer_id = auth.uid())
));

create policy "Participants send application messages"
on public.application_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.seeker_applications a
    where a.id = application_id
      and a.status in ('選考中', '採用決定')
      and (a.user_id = auth.uid() or a.employer_id = auth.uid())
  )
);

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

-- Let an employer view the seeker_profiles / seeker_resumes rows of applicants
-- who applied to a job posted by that employer, without exposing unrelated seekers.

drop policy if exists "Employers view applicant seeker profiles" on public.seeker_profiles;

create policy "Employers view applicant seeker profiles"
on public.seeker_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.seeker_applications a
    where a.user_id = seeker_profiles.user_id
      and a.employer_id = auth.uid()
  )
);

drop policy if exists "Employers view applicant seeker resumes" on public.seeker_resumes;

create policy "Employers view applicant seeker resumes"
on public.seeker_resumes
for select
to authenticated
using (
  exists (
    select 1 from public.seeker_applications a
    where a.user_id = seeker_resumes.user_id
      and a.employer_id = auth.uid()
  )
);

-- Operational administrator role: a boolean flag on employer_profiles,
-- manually granted, with read-all access to seeker/employer profiles.

alter table public.employer_profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.employer_profiles
    where user_id = auth.uid() and is_admin = true
  );
$$;

create or replace function public.prevent_self_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null then
    if not public.is_admin()
       or (auth.uid() = old.user_id and old.is_admin = true and new.is_admin = false) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists employer_profiles_guard_is_admin on public.employer_profiles;
create trigger employer_profiles_guard_is_admin
before update on public.employer_profiles
for each row execute function public.prevent_self_admin_escalation();

drop policy if exists "Admins read all seeker profiles" on public.seeker_profiles;
create policy "Admins read all seeker profiles"
on public.seeker_profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Admins update seeker profiles" on public.seeker_profiles;
create policy "Admins update seeker profiles"
on public.seeker_profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.protect_seeker_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and not public.is_admin() then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

drop trigger if exists seeker_profiles_protect_account_status on public.seeker_profiles;
create trigger seeker_profiles_protect_account_status
before update on public.seeker_profiles
for each row execute function public.protect_seeker_account_status();

drop policy if exists "Admins read all employer profiles" on public.employer_profiles;
create policy "Admins read all employer profiles"
on public.employer_profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Admins update employer profiles" on public.employer_profiles;
create policy "Admins update employer profiles"
on public.employer_profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.protect_employer_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status
     and auth.uid() is not null
     and (auth.uid() = old.user_id or not public.is_admin()) then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

drop trigger if exists employer_profiles_protect_account_status on public.employer_profiles;
create trigger employer_profiles_protect_account_status
before update on public.employer_profiles
for each row execute function public.protect_employer_account_status();

-- Extend admin read access to jobs and applications, plus a bounded
-- moderation ability (open/close any job posting).

drop policy if exists "Admins read all jobs" on public.jobs;
create policy "Admins read all jobs"
on public.jobs for select to authenticated
using (public.is_admin());

drop policy if exists "Admins update all jobs" on public.jobs;
create policy "Admins update all jobs"
on public.jobs for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read all applications" on public.seeker_applications;
create policy "Admins read all applications"
on public.seeker_applications for select to authenticated
using (public.is_admin());

-- Success-fee billing: one invoice per confirmed hire (application-chat.html's
-- hireApplicant() sets seeker_applications.status = '採用決定'). ¥3,300 tax
-- included per hire, created automatically and exactly once per application.

create table if not exists public.hire_invoices (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.seeker_applications(id) on delete cascade,
  employer_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid,
  job_title text,
  facility_name text,
  seeker_name text,
  unit_price_amount integer not null default 3300,
  total_amount integer not null default 3300,
  payment_status text not null default '未払い'
    check (payment_status in ('未払い', '決済処理中', '支払い済み', '決済エラー', '返金済み')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hire_invoices_employer_id_idx on public.hire_invoices(employer_id);
create index if not exists hire_invoices_payment_status_idx on public.hire_invoices(payment_status);

drop trigger if exists hire_invoices_set_updated_at on public.hire_invoices;
create trigger hire_invoices_set_updated_at
before update on public.hire_invoices
for each row execute function public.set_updated_at();

-- Create the invoice the moment a hire is confirmed (and only then), and never
-- more than once per application even if this fires twice (double-click, retry).
create or replace function public.create_hire_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = '採用決定' and old.status is distinct from '採用決定' then
    insert into public.hire_invoices (application_id, employer_id, job_id, job_title, facility_name, seeker_name)
    values (new.id, new.employer_id, new.job_id, new.job_title, new.facility_name, new.seeker_name)
    on conflict (application_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists seeker_applications_create_hire_invoice on public.seeker_applications;
create trigger seeker_applications_create_hire_invoice
after update on public.seeker_applications
for each row execute function public.create_hire_invoice();

alter table public.hire_invoices enable row level security;

drop policy if exists "Employers read own hire invoices" on public.hire_invoices;
create policy "Employers read own hire invoices"
on public.hire_invoices for select to authenticated
using (auth.uid() = employer_id);

drop policy if exists "Admins read all hire invoices" on public.hire_invoices;
create policy "Admins read all hire invoices"
on public.hire_invoices for select to authenticated
using (public.is_admin());

drop policy if exists "Admins update hire invoices" on public.hire_invoices;
create policy "Admins update hire invoices"
on public.hire_invoices for update to authenticated
using (public.is_admin())
with check (public.is_admin());

