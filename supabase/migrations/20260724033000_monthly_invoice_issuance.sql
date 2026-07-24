-- Persist when an administrator issues the monthly bundled invoice for
-- each hire paid by invoice. Admins already have update permission on
-- hire_invoices; employers retain read-only access to their own rows.

alter table public.hire_invoices
  add column if not exists invoice_issued_at timestamptz;

create index if not exists hire_invoices_invoice_issued_at_idx
  on public.hire_invoices(invoice_issued_at);
