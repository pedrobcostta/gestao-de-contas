-- This function updates the user creation process by removing the automatic granting of full permissions.
-- Permissions will now be handled explicitly by the user management functions.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  m_type TEXT;
  managements TEXT[] := ARRAY['pessoal', 'casa', 'pai', 'mae'];
BEGIN
  -- Step 1: Create a profile for each management type for the new user
  FOREACH m_type IN ARRAY managements
  LOOP
    INSERT INTO public.profiles (id, first_name, last_name, role, status, management_type)
    VALUES (
      new.id,
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      'admin', -- New users are created as admins
      'active',
      m_type
    )
    ON CONFLICT (id, management_type) DO NOTHING;
  END LOOP;

  RETURN new;
END;
$$;

-- Re-apply the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();