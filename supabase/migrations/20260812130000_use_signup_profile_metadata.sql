-- Reuse the existing signup metadata so the first onboarding screen does not
-- ask a new member to repeat their name or phone number.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, phone, area)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Pengguna'
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    'Belum diatur'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
