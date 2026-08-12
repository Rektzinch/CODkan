-- my_profile no longer exposes the removed deletion-request field.
DROP FUNCTION IF EXISTS public.my_profile();

CREATE FUNCTION public.my_profile()
RETURNS TABLE (
  id uuid, display_name text, phone text, area text, avatar_url text,
  completed_deals integer, no_shows integer, created_at timestamptz,
  onboarded boolean, notifications_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.display_name, p.phone, p.area, p.avatar_url,
         p.completed_deals, p.no_shows, p.created_at,
         (p.area IS DISTINCT FROM 'Belum diatur') AS onboarded,
         p.notifications_enabled
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_profile() TO authenticated;

-- Delete the caller's account and all rows that use NO ACTION foreign keys first.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  DELETE FROM public.reports
  WHERE reporter_id = v_user
     OR target_user_id = v_user
     OR deal_id IN (SELECT id FROM public.deals WHERE buyer_id = v_user OR seller_id = v_user)
     OR listing_id IN (SELECT id FROM public.listings WHERE seller_id = v_user);

  DELETE FROM public.deals
  WHERE buyer_id = v_user OR seller_id = v_user;

  DELETE FROM public.buyer_listing_state
  WHERE kicked_by = v_user;

  DELETE FROM public.listings
  WHERE seller_id = v_user;

  DELETE FROM storage.objects
  WHERE bucket_id = 'listing-media'
    AND (name LIKE v_user::text || '/%' OR name LIKE 'avatars/' || v_user::text || '/%');

  DELETE FROM public.profiles WHERE id = v_user;
  DELETE FROM auth.users WHERE id = v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
