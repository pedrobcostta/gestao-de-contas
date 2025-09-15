-- Add the management_type column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS management_type TEXT;

-- Update existing rows to have a default management_type to avoid null constraint violation
UPDATE public.profiles SET management_type = 'pessoal' WHERE management_type IS NULL;

-- Now that there are no nulls, make the column NOT NULL
ALTER TABLE public.profiles ALTER COLUMN management_type SET NOT NULL;

-- Add detailed address fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado TEXT;

-- Drop the old primary key and create the new composite primary key
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles ADD PRIMARY KEY (id, management_type);