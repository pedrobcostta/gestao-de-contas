-- Criar tipos personalizados (ENUMs) para garantir a consistência dos dados
CREATE TYPE public.management_type AS ENUM ('pessoal', 'casa', 'pai', 'mae');
CREATE TYPE public.purchase_type AS ENUM ('unica', 'parcelada');
CREATE TYPE public.account_status AS ENUM ('pago', 'pendente', 'vencido');

-- Criar a tabela de contas
CREATE TABLE public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  management_type public.management_type NOT NULL,
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  total_value NUMERIC(10, 2) NOT NULL,
  purchase_type public.purchase_type NOT NULL,
  installments_total INT,
  installment_current INT,
  installment_value NUMERIC(10, 2),
  payment_proof_url TEXT,
  bill_proof_url TEXT,
  payment_method TEXT,
  notes TEXT,
  status public.account_status NOT NULL,
  fees_and_fines NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar a Segurança em Nível de Linha (RLS) para proteger os dados
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança para garantir que os usuários só possam acessar suas próprias contas
CREATE POLICY "Users can manage their own accounts" ON public.accounts
FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);