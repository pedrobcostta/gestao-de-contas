ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS system_generated_bill_url TEXT,
ADD COLUMN IF NOT EXISTS full_report_url TEXT;

-- Atualizando a coluna other_attachments para suportar a nova estrutura
ALTER TABLE public.accounts
ALTER COLUMN other_attachments TYPE JSONB[] USING ARRAY[]::JSONB[];