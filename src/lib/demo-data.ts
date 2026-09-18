import { addDays, format } from "date-fns";
import type { CalendarEvent, Task } from "@/types/database";

const today = format(new Date(), "yyyy-MM-dd");

export const demoEvents: CalendarEvent[] = [
  {
    id: "demo-event-1",
    user_id: "demo",
    title: "Reunião com proprietário",
    description: "Alinhar preço de entrada e exclusividade.",
    date: today,
    start_time: "09:00",
    end_time: "09:45",
    type: "reunião",
    location: "Escritório",
    status: "agendado",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-event-2",
    user_id: "demo",
    title: "Visita no apartamento do Centro",
    description: "Cliente busca 2 quartos com vaga.",
    date: today,
    start_time: "11:00",
    end_time: "12:00",
    type: "visita",
    location: "Centro",
    status: "agendado",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-event-3",
    user_id: "demo",
    title: "Captação no Jardim América",
    description: "Levar briefing de fotos e checklist documental.",
    date: today,
    start_time: "14:30",
    end_time: "15:30",
    type: "captação",
    location: "Jardim América",
    status: "agendado",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-event-4",
    user_id: "demo",
    title: "Retorno cliente investidor",
    description: "Enviar simulação de rendimento e condomínio.",
    date: today,
    start_time: "17:00",
    end_time: "17:20",
    type: "follow-up",
    location: "WhatsApp",
    status: "agendado",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const demoTasks: Task[] = [
  {
    id: "demo-task-1",
    user_id: "demo",
    title: "Confirmar visita das 11h",
    description: "Enviar localização e checklist para o cliente.",
    due_date: today,
    due_time: "08:30",
    priority: "alta",
    status: "pendente",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-task-2",
    user_id: "demo",
    title: "Enviar documentação do imóvel",
    description: null,
    due_date: today,
    due_time: "13:00",
    priority: "média",
    status: "pendente",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-task-3",
    user_id: "demo",
    title: "Retornar cliente de financiamento",
    description: null,
    due_date: format(addDays(new Date(), -1), "yyyy-MM-dd"),
    due_time: "16:00",
    priority: "alta",
    status: "pendente",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-task-4",
    user_id: "demo",
    title: "Atualizar roteiro de visitas",
    description: null,
    due_date: today,
    due_time: "18:00",
    priority: "baixa",
    status: "concluída",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-task-5",
    user_id: "demo",
    title: "Separar contrato de proposta",
    description: null,
    due_date: today,
    due_time: "10:00",
    priority: "média",
    status: "concluída",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
