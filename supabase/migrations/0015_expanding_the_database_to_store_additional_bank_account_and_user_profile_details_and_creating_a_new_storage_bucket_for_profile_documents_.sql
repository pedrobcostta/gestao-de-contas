-- Expand bank_accounts table
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS owner_cpf TEXT;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS card_last_4_digits TEXT;

-- Expand profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_certificate_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_document_front_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_document_back_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_document_model TEXT; -- 'novo' or 'antigo'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voter_id_url TEXT;

-- Create storage bucket for profile documents
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-documents', 'profile-documents', true) ON CONFLICT (id) DO NOTHING;

-- Policies for 'profile-documents' bucket
DROP POLICY IF EXISTS "Authenticated users can manage their profile documents" ON storage.objects;
CREATE POLICY "Authenticated users can manage their profile documents" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'profile-documents' AND owner = auth.uid());