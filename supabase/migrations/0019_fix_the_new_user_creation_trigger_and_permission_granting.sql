-- This function fixes the user creation process by consolidating the logic for creating
-- profiles and granting default permissions into a single, robust trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  m_type TEXT;
  t_name TEXT;
  managements TEXT[] := ARRAY['pessoal', 'casa', 'pai', 'mae'];
  tabs TEXT[] := ARRAY['contas', 'pix', 'bancos', 'pagas', 'relatorios', 'perfil', 'usuarios'];
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
  
  -- Step 2: Grant full permissions to the new user by inserting directly
  FOREACH m_type IN ARRAY managements
  LOOP
    FOREACH t_name IN ARRAY tabs
    LOOP
      INSERT INTO public.user_permissions (user_id, management_type, tab, can_read, can_write, can_edit, can_delete)
      VALUES (new.id, m_type, t_name, true, true, true, true)
      ON CONFLICT (user_id, management_type, tab) DO UPDATE SET
        can_read = true,
        can_write = true,
        can_edit = true,
        can_delete = true;
    END LOOP;
  END LOOP;

  RETURN new;
END;
$$;

-- Re-apply the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();