export interface Account {
  id: string;
  user_id: string;
  management_type: "pessoal" | "casa" | "pai" | "mae";
  name: string;
  due_date: string;
  payment_date: string | null;
  total_value: number;
  account_type: "unica" | "parcelada" | "recorrente";
  installments_total: number | null;
  installment_current: number | null;
  installment_value: number | null;
  payment_proof_url: string | null;
  bill_proof_url: string | null;
  other_attachments: string[] | null;
  payment_method: "dinheiro" | "pix" | "boleto" | "transferencia" | "cartao" | null;
  payment_bank_id: string | null;
  pix_br_code: string | null;
  notes: string | null;
  status: "pago" | "pendente" | "vencido";
  fees_and_fines: number | null;
  created_at: string;
  recurrence_end_date: string | null;
  group_id: string | null;
}

export interface PixKey {
  id: string;
  user_id: string;
  management_type: "pessoal" | "casa" | "pai" | "mae";
  key_type: "cpf_cnpj" | "celular" | "email" | "aleatoria" | "br_code";
  key_value: string;
  bank_name: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  management_type: "pessoal" | "casa" | "pai" | "mae";
  account_type: "conta_corrente" | "poupanca" | "cartao_credito";
  bank_name: string;
  account_name: string;
  agency: string | null;
  account_number: string | null;
  card_limit: number | null;
  card_closing_day: number | null;
  card_due_day: number | null;
  created_at: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  updated_at: string;
}

export interface User {
  id: string;
  email?: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}