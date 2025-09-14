-- Criar um tipo personalizado para os tipos de chave PIX
CREATE TYPE public.pix_key_type AS ENUM ('cpf_cnpj', 'celular', 'email', 'aleatoria');

-- Criar a tabela para armazenar as chaves PIX
CREATE TABLE public.pix_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  management_type public.management_type NOT NULL,
  key_type public.pix_key_type NOT NULL,
  key_value TEXT NOT NULL,
  bank_name TEXT,
  owner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar a Segurança em Nível de Linha (RLS)
ALTER TABLE public.pix_keys ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança para que os usuários gerenciem apenas suas próprias chaves
CREATE POLICY "Users can manage their own pix keys" ON public.pix_keys
FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);