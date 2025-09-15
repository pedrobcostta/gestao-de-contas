// ... (imports permanecem os mesmos)

const formSchema = z.object({
  // ... (outros campos permanecem)
  bill_proof: z.instanceof(File).optional().nullable(),
  payment_proof: z.instanceof(File).optional().nullable(),
  other_attachments_form: z.array(z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    file: z.instanceof(File).refine(file => !!file, "Arquivo é obrigatório"),
  })).optional(),
  // ... (restante do schema)
});

export function AccountForm({ isOpen, setIsOpen, account, managementType }: AccountFormProps) {
  // ... (hooks e estados anteriores permanecem)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // ... (outros defaults)
      bill_proof: null,
      payment_proof: null,
      other_attachments_form: [],
    },
  });

  // Corrigindo o reset para lidar com arquivos
  useEffect(() => {
    if (account) {
      form.reset({
        ...account,
        due_date: new Date(`${account.due_date}T00:00:00`),
        payment_date: account.payment_date ? new Date(`${account.payment_date}T00:00:00`) : null,
        recurrence_end_date: account.recurrence_end_date ? new Date(`${account.recurrence_end_date}T00:00:00`) : null,
        bill_proof: null, // Não carregamos o arquivo existente no form
        payment_proof: null, // Não carregamos o arquivo existente no form
        other_attachments_form: [],
      });
    } else {
      form.reset({
        // ... (valores padrão)
        bill_proof: null,
        payment_proof: null,
        other_attachments_form: [],
      });
    }
  }, [account, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      // Upload dos arquivos
      const bill_proof_url = values.bill_proof ? await uploadFile(values.bill_proof, session.user.id) : account?.bill_proof_url || null;
      const payment_proof_url = values.payment_proof ? await uploadFile(values.payment_proof, session.user.id) : account?.payment_proof_url || null;
      
      const other_attachments: CustomAttachment[] = account?.other_attachments || [];
      if (values.other_attachments_form) {
        for (const attachment of values.other_attachments_form) {
          if (attachment.file) {
            const url = await uploadFile(attachment.file, session.user.id);
            if (url) other_attachments.push({ name: attachment.name, url });
          }
        }
      }

      // ... (restante da lógica de submit)
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px]">
        {/* ... (cabeçalho permanece igual) */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            {/* ... (outros campos permanecem) */}

            {/* Campos de arquivo corrigidos */}
            <FormField 
              control={form.control}
              name="bill_proof"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fatura / Conta</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      onChange={(e) => field.onChange(e.target.files?.[0] || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control}
              name="payment_proof"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprovante de Pagamento</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      onChange={(e) => field.onChange(e.target.files?.[0] || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Anexos corrigidos */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <FormLabel>Outros Anexos</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`other_attachments_form.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input {...field} placeholder="Nome do anexo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`other_attachments_form.${index}.file`}
                    render={({ field: { onChange, ...rest } }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input 
                            type="file" 
                            onChange={(e) => onChange(e.target.files?.[0] || null)}
                            {...rest}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <XCircle className="h-5 w-5 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ name: '', file: null as unknown as File })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Anexo
              </Button>
            </div>

            {/* ... (restante do formulário) */}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}