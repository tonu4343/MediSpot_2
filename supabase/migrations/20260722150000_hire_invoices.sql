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
