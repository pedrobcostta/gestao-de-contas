-- Add status to profiles table
ALTER TABLE public.profiles
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  management_type TEXT NOT NULL,
  tab TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, management_type, tab)
);

-- Add RLS to user_permissions table
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage all permissions
CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy for users to read their own permissions
CREATE POLICY "Users can read their own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Function to grant full permissions to a user
CREATE OR REPLACE FUNCTION grant_full_permissions(user_id_to_grant UUID)
RETURNS void AS $$
DECLARE
  m_type TEXT;
  t_name TEXT;
  managements TEXT[] := ARRAY['pessoal', 'casa', 'pai', 'mae'];
  tabs TEXT[] := ARRAY['contas', 'pix', 'bancos', 'pagas', 'relatorios', 'perfil', 'usuarios'];
BEGIN
  FOREACH m_type IN ARRAY managements
  LOOP
    FOREACH t_name IN ARRAY tabs
    LOOP
      INSERT INTO public.user_permissions (user_id, management_type, tab, can_read, can_write, can_edit, can_delete)
      VALUES (user_id_to_grant, m_type, t_name, true, true, true, true)
      ON CONFLICT (user_id, management_type, tab) DO UPDATE SET
        can_read = true,
        can_write = true,
        can_edit = true,
        can_delete = true;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to all existing users
SELECT grant_full_permissions(id) FROM auth.users;

-- Update handle_new_user function to grant full permissions on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role, status)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name',
    'admin',
    'active'
  );
  
  PERFORM grant_full_permissions(new.id);

  RETURN new;
END;
$$;

-- Re-apply the trigger to use the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();