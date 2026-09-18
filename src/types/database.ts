export type Profile = {
  id: string;
  user_id: string;
  nome: string | null;
  foto: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
