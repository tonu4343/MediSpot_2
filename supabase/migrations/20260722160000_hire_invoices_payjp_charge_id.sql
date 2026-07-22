-- Record the pay.jp charge id on the invoice it paid, so an admin can look
-- up/refund the actual charge in the pay.jp dashboard from admin-payments.html.
alter table public.hire_invoices add column if not exists payjp_charge_id text;
