-- Create the new ENUM type for account_type
CREATE TYPE public.account_type_enum AS ENUM ('unica', 'parcelada', 'recorrente');

-- Add the new columns to the accounts table
ALTER TABLE public.accounts
  ADD COLUMN account_type public.account_type_enum,
  ADD COLUMN recurrence_end_date DATE,
  ADD COLUMN payment_bank_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN pix_br_code TEXT;

-- Data migration from old columns to the new one
UPDATE public.accounts
SET account_type = 
  CASE 
    WHEN is_recurrent = TRUE THEN 'recorrente'::public.account_type_enum
    WHEN purchase_type = 'parcelada' THEN 'parcelada'::public.account_type_enum
    ELSE 'unica'::public.account_type_enum
  END;

-- Now that data is migrated, we can set the new column to NOT NULL
ALTER TABLE public.accounts
  ALTER COLUMN account_type SET NOT NULL;

-- Drop the old columns
ALTER TABLE public.accounts
  DROP COLUMN purchase_type,
  DROP COLUMN is_recurrent;