-- Make account + profile creation atomic. Previously the client called
-- auth.signUp() and then, separately, .insert()'d the profile row - if
-- that second call failed, the auth account was left stranded with no
-- profile and no way to retry (the email was already "taken"). A
-- trigger on auth.users runs inside the SAME transaction Supabase Auth
-- uses to create the user: if it raises, the whole signUp() fails and
-- no auth.users row is left behind either, so registration can simply
-- be retried. This mirrors the existing create_hire_invoice() trigger
-- pattern already used in this project.

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_value text := new.raw_user_meta_data ->> 'role';
begin
  if role_value = 'seeker' then
    insert into public.seeker_profiles (
      user_id, name, email, birth_date, phone, license, experience_years,
      preferred_area, preferred_style, skills, pr, source_path
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      new.email,
      nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'license',
      new.raw_user_meta_data ->> 'experience_years',
      new.raw_user_meta_data ->> 'preferred_area',
      new.raw_user_meta_data ->> 'preferred_style',
      coalesce(new.raw_user_meta_data -> 'skills', '[]'::jsonb),
      new.raw_user_meta_data ->> 'pr',
      new.raw_user_meta_data ->> 'source_path'
    );
  elsif role_value = 'employer' then
    insert into public.employer_profiles (
      user_id, contact_name, position, facility_name, facility_type,
      staff_need, phone, email, address, recruit_styles, note, source_path
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'contact_name', ''),
      new.raw_user_meta_data ->> 'position',
      coalesce(new.raw_user_meta_data ->> 'facility_name', ''),
      new.raw_user_meta_data ->> 'facility_type',
      new.raw_user_meta_data ->> 'staff_need',
      new.raw_user_meta_data ->> 'phone',
      new.email,
      new.raw_user_meta_data ->> 'address',
      coalesce(new.raw_user_meta_data -> 'recruit_styles', '[]'::jsonb),
      new.raw_user_meta_data ->> 'note',
      new.raw_user_meta_data ->> 'source_path'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_profile();

-- The client no longer inserts profile rows directly after signUp() -
-- the trigger above does it, security definer, regardless of anon/
-- authenticated context. These anon policies (with check (true), i.e.
-- accept any payload from anyone) existed only to let that old
-- pre-confirmation client insert through; remove that write surface.
drop policy if exists "Allow seeker profile anonymous inserts" on public.seeker_profiles;
drop policy if exists "Allow employer profile anonymous inserts" on public.employer_profiles;
