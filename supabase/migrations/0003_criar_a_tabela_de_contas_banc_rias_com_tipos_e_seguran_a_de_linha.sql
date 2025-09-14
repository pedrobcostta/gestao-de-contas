-- Criar um tipo personalizado para os tipos de conta bancária
CREATE TYPE public.bank_account_type AS ENUM ('conta_corrente', 'poupanca', 'cartao_credito');

-- Criar a tabela para armazenar as contas bancárias e cartões
CREATE TABLE public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  management_type public.management_type NOT NULL,
  account_type public.bank_account_type NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  agency TEXT,
  account_number TEXT,
  card_limit NUMERIC(10, 2),
  card_closing_day INT,
  card_due_day INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar a Segurança em Nível de Linha (RLS)
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança para que os usuários gerenciem apenas suas próprias contas
CREATE POLICY "Users can manage their own bank accounts" ON public.bank_accounts
FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);