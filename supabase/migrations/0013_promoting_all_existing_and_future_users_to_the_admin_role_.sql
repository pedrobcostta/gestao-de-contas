-- Update all existing users to have the 'admin' role
UPDATE public.profiles SET role = 'admin';

-- Change the default role for new users to 'admin'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'admin';