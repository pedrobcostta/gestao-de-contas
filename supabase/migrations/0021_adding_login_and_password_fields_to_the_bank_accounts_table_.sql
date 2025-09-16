ALTER TABLE public.bank_accounts
ADD COLUMN login_identifier TEXT,
ADD COLUMN access_password TEXT,
ADD COLUMN transaction_password TEXT;