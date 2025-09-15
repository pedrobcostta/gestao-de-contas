import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  cpf: z.string().optional().nullable(),
  rg: z.string().optional().nullable(),
  birth_date: z.date().optional().nullable(),
  address: z.string().optional().nullable(),
  identity_document_model: z.enum(['novo', 'antigo']).optional().nullable(),
});

type FileUploadState = {
  birth_certificate_url: File | null;
  identity_document_front_url: File | null;
  identity_document_back_url: File | null;
  cnh_url: File | null;
  voter_id_url: File | null;
};

export function ConfigurationTabContent() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileUploadState>({
    birth_certificate_url: null,
    identity_document_front_url: null,
    identity_document_back_url: null,
    cnh_url: null,
    voter_id_url: null,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) { console.error("Error fetching profile:", error); return null; }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        ...profile,
        birth_date: profile.birth_date ? parseISO(profile.birth_date) : null,
      });
    }
  }, [profile, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FileUploadState) => {
    if (e.target.files?.[0]) {
      setFiles(prev => ({ ...prev, [field]: e.target.files![0] }));
    }
  };

  const uploadFile = async (file: File, bucket: string, userId: string): Promise<string> => {
    const filePath = `${userId}/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) throw new Error(`Erro no upload do arquivo: ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!session?.user?.id) return showError("Usuário não encontrado.");
    setIsSubmitting(true);

    try {
      const updatedUrls: Partial<Profile> = {};
      for (const key in files) {
        const file = files[key as keyof FileUploadState];
        if (file) {
          updatedUrls[key as keyof Profile] = await uploadFile(file, 'profile-documents', session.user.id);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...values,
          birth_date: values.birth_date ? format(values.birth_date, 'yyyy-MM-dd') : null,
          ...updatedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) throw error;
      showSuccess('Perfil atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
    } catch (error: any) {
      showError(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <p>Carregando configurações...</p>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="first_name" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="last_name" render={({ field }) => (
              <FormItem><FormLabel>Sobrenome</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="cpf" render={({ field }) => (
              <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="rg" render={({ field }) => (
              <FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="birth_date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Data de Nascimento</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent></Popover><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>Faça o upload dos seus documentos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <FormItem><FormLabel>Certidão de Nascimento</FormLabel><FormControl><Input type="file" onChange={e => handleFileChange(e, 'birth_certificate_url')} /></FormControl></FormItem>
              {profile?.birth_certificate_url && <a href={profile.birth_certificate_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver atual</a>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <FormItem><FormLabel>CNH</FormLabel><FormControl><Input type="file" onChange={e => handleFileChange(e, 'cnh_url')} /></FormControl></FormItem>
              {profile?.cnh_url && <a href={profile.cnh_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver atual</a>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <FormItem><FormLabel>Título de Eleitor</FormLabel><FormControl><Input type="file" onChange={e => handleFileChange(e, 'voter_id_url')} /></FormControl></FormItem>
              {profile?.voter_id_url && <a href={profile.voter_id_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver atual</a>}
            </div>
            <div className="space-y-2 p-4 border rounded-md">
              <FormLabel>Documento de Identidade (RG)</FormLabel>
              <FormField control={form.control} name="identity_document_model" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Modelo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="novo">Modelo Novo</SelectItem><SelectItem value="antigo">Modelo Antigo</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <FormItem><FormLabel className="text-xs">Frente</FormLabel><FormControl><Input type="file" onChange={e => handleFileChange(e, 'identity_document_front_url')} /></FormControl></FormItem>
                {profile?.identity_document_front_url && <a href={profile.identity_document_front_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver atual</a>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <FormItem><FormLabel className="text-xs">Verso</FormLabel><FormControl><Input type="file" onChange={e => handleFileChange(e, 'identity_document_back_url')} /></FormControl></FormItem>
                {profile?.identity_document_back_url && <a href={profile.identity_document_back_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver atual</a>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}