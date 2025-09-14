ALTER TABLE public.accounts
ADD COLUMN is_recurrent BOOLEAN NOT NULL DEFAULT false;