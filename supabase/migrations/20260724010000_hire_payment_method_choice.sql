-- Employer feedback: payment method is chosen exactly once, at the moment
-- a hire is confirmed (not from a persistent "pay" button on the invoice
-- list later). Two choices: pay by card via pay.jp immediately, or defer
-- to the end-of-month bundled invoice (handled manually by admin from
-- admin-payments.html, same as today).

alter table public.hire_invoices add column if not exists payment_method text not null default 'invoice' check (payment_method in ('card', 'invoice'));

drop function if exists public.employer_update_application_status(uuid, text);

create or replace function public.employer_update_application_status(
  p_application_id uuid,
  p_status text,
  p_payment_method text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.seeker_applications
    where id = p_application_id
      and employer_id = auth.uid()
  ) then
    return;
  end if;

  if not public.is_employer_active(auth.uid()) then
    return;
  end if;

  if p_status not in (
    'applied', 'screening', 'offer_pending', 'hired', 'working', 'completed',
    'rejected', 'cancelled'
  ) then
    raise exception 'invalid status value: %', p_status;
  end if;

  if p_payment_method is not null and p_payment_method not in ('card', 'invoice') then
    raise exception 'invalid payment method: %', p_payment_method;
  end if;

  update public.seeker_applications
  set status = p_status
  where id = p_application_id;

  -- The hire_invoices row (if any) was just created synchronously by the
  -- create_hire_invoice() trigger above, in the same statement.
  if p_status = 'hired' and p_payment_method is not null then
    update public.hire_invoices
    set payment_method = p_payment_method
    where application_id = p_application_id;
  end if;
end;
$$;

grant execute on function public.employer_update_application_status(uuid, text, text) to authenticated;
