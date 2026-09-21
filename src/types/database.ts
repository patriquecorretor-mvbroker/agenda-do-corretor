export type Profile = {
  id: string;
  user_id: string;
  nome: string | null;
  foto: string | null;
  logo: string | null;
  nome_marca: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  creci: string | null;
  cidade: string | null;
  empresa: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  meta_vgv_mensal: number | null;
  meta_vendas_mensal: number | null;
  meta_comissao_mensal: number | null;
  created_at: string;
  updated_at: string;
};

export type EventType =
  | "visita"
  | "reunião"
  | "ligação"
  | "follow-up"
  | "captação"
  | "plantão"
  | "documentação"
  | "conteúdo"
  | "pessoal"
  | "outro";

export type EventStatus = "agendado" | "concluído" | "cancelado";

export type ClientStatus = "lead" | "em contato" | "qualificado" | "visita agendada" | "proposta" | "negociação" | "venda realizada" | "pós-venda" | "perdido";

export type Client = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  neighborhood: string | null;
  property_profile: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bedrooms: number | null;
  notes: string | null;
  source: string | null;
  status: ClientStatus;
  sale_date: string | null;
  next_follow_up: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};

export type ClientActivityType = "cadastro" | "mudança de etapa" | "ligação" | "mensagem" | "visita" | "proposta" | "venda" | "follow-up" | "observação";

export type ClientActivity = {
  id: string;
  user_id: string;
  client_id: string;
  type: ClientActivityType;
  title: string;
  details: string | null;
  occurred_at: string;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  type: EventType;
  location: string | null;
  status: EventStatus;
  notes: string | null;
  client_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskPriority = "baixa" | "média" | "alta";
export type TaskStatus = "pendente" | "concluída";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

export type DailySummary = {
  id: string;
  user_id: string;
  date: string;
  completed_events: number;
  pending_events: number;
  completed_tasks: number;
  pending_tasks: number;
  productivity_percent: number;
  tomorrow_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CommissionStatus =
  | "estimada"
  | "em negociação"
  | "confirmada"
  | "parcialmente recebida"
  | "recebida"
  | "atrasada"
  | "cancelada";

export type InstallmentStatus = "prevista" | "confirmada" | "parcialmente recebida" | "recebida" | "atrasada" | "cancelada";
export type FinancialTransactionType = "income" | "expense";
export type FinancialTransactionStatus = "pendente" | "pago" | "recebido" | "parcial" | "atrasado" | "cancelado";

export type Commission = {
  id: string;
  user_id: string;
  sale_id: string | null;
  client: string | null;
  property: string | null;
  development: string | null;
  builder: string | null;
  sale_date: string | null;
  vgv: number;
  total_commission_percent: number;
  gross_commission: number;
  broker_percent: number;
  broker_commission: number;
  discounts: number;
  partner_split: number;
  net_commission: number;
  installments_count: number;
  first_expected_date: string | null;
  notes: string | null;
  status: CommissionStatus;
  created_at: string;
  updated_at: string;
};

export type CommissionInstallment = {
  id: string;
  user_id: string;
  commission_id: string;
  installment_number: number;
  due_date: string;
  expected_amount: number;
  received_amount: number;
  received_date: string | null;
  status: InstallmentStatus;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialTransaction = {
  id: string;
  user_id: string;
  type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: FinancialTransactionStatus;
  payment_method: string | null;
  client_id: string | null;
  property_id: string | null;
  sale_id: string | null;
  commission_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialCategory = {
  id: string;
  user_id: string;
  type: FinancialTransactionType;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type MonthlyBudget = {
  id: string;
  user_id: string;
  category: string;
  month: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
};

export type FinancialAttachment = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  commission_id: string | null;
  file_path: string;
  file_type: string | null;
  notes: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { user_id: string };
        Update: Partial<Profile>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Omit<Partial<CalendarEvent>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          title: string;
          date: string;
          start_time: string;
        };
        Update: Partial<CalendarEvent>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Partial<Client>, "id" | "created_at" | "updated_at"> & { user_id: string; name: string };
        Update: Partial<Client>;
      };
      client_activities: {
        Row: ClientActivity;
        Insert: Omit<Partial<ClientActivity>, "id" | "created_at"> & {
          user_id: string;
          client_id: string;
          type: ClientActivityType;
          title: string;
        };
        Update: Partial<ClientActivity>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Partial<Task>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          title: string;
        };
        Update: Partial<Task>;
      };
      daily_summaries: {
        Row: DailySummary;
        Insert: Omit<Partial<DailySummary>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          date: string;
        };
        Update: Partial<DailySummary>;
      };
      financial_transactions: {
        Row: FinancialTransaction;
        Insert: Omit<Partial<FinancialTransaction>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          type: FinancialTransactionType;
          category: string;
          description: string;
          amount: number;
        };
        Update: Partial<FinancialTransaction>;
      };
      commissions: {
        Row: Commission;
        Insert: Omit<Partial<Commission>, "id" | "created_at" | "updated_at"> & { user_id: string };
        Update: Partial<Commission>;
      };
      commission_installments: {
        Row: CommissionInstallment;
        Insert: Omit<Partial<CommissionInstallment>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          commission_id: string;
          installment_number: number;
          due_date: string;
          expected_amount: number;
        };
        Update: Partial<CommissionInstallment>;
      };
      financial_categories: {
        Row: FinancialCategory;
        Insert: Omit<Partial<FinancialCategory>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          type: FinancialTransactionType;
          name: string;
        };
        Update: Partial<FinancialCategory>;
      };
      monthly_budgets: {
        Row: MonthlyBudget;
        Insert: Omit<Partial<MonthlyBudget>, "id" | "created_at" | "updated_at"> & {
          user_id: string;
          category: string;
          month: string;
          limit_amount: number;
        };
        Update: Partial<MonthlyBudget>;
      };
      financial_attachments: {
        Row: FinancialAttachment;
        Insert: Omit<Partial<FinancialAttachment>, "id" | "created_at"> & {
          user_id: string;
          file_path: string;
        };
        Update: Partial<FinancialAttachment>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
