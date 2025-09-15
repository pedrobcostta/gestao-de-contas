-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-bills', 'generated-bills', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-reports', 'generated-reports', true) ON CONFLICT (id) DO NOTHING;

-- Policies for 'attachments' bucket
DROP POLICY IF EXISTS "Authenticated users can manage attachments" ON storage.objects;
CREATE POLICY "Authenticated users can manage attachments" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'attachments' AND owner = auth.uid());

-- Policies for 'generated-bills' bucket
DROP POLICY IF EXISTS "Authenticated users can manage generated bills" ON storage.objects;
CREATE POLICY "Authenticated users can manage generated bills" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'generated-bills' AND owner = auth.uid());

-- Policies for 'generated-reports' bucket
DROP POLICY IF EXISTS "Authenticated users can manage generated reports" ON storage.objects;
CREATE POLICY "Authenticated users can manage generated reports" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'generated-reports' AND owner = auth.uid());