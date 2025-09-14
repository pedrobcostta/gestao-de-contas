-- Adiciona uma coluna para múltiplos anexos na tabela de contas
ALTER TABLE public.accounts ADD COLUMN other_attachments TEXT[] NULL;

-- Cria um local seguro (bucket) para armazenar os arquivos, caso ainda não exista
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', true, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Define as regras de segurança para o armazenamento de arquivos

-- Permite que qualquer pessoa visualize os anexos (se tiver o link)
CREATE POLICY "Public read access for attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

-- Permite que usuários logados enviem novos anexos
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

-- Permite que os usuários atualizem seus próprios anexos
CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid() = (storage.foldername(name))[1]::uuid );

-- Permite que os usuários deletem seus próprios anexos
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING ( auth.uid() = (storage.foldername(name))[1]::uuid );