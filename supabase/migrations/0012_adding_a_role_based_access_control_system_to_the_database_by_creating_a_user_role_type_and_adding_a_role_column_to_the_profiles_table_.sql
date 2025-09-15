-- Create a user role type to ensure data consistency
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Add the 'role' column to the profiles table
-- All existing and new users will default to the 'user' role
ALTER TABLE public.profiles
ADD COLUMN role user_role DEFAULT 'user' NOT NULL;