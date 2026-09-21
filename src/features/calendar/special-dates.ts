import { format } from "date-fns";

export type SpecialDate = {
  key: string;
  title: string;
  kind: "Feriado" | "Data profissional" | "Data especial";
  message: string;
};

const dates: Record<string, Omit<SpecialDate, "key">> = {
  "01-01": { title: "Confraternização Universal", kind: "Feriado", message: "Um novo ciclo para transformar planos em conquistas." },
  "04-21": { title: "Tiradentes", kind: "Feriado", message: "Hoje é feriado nacional. Confirme horários antes de sair para visitas." },
  "05-01": { title: "Dia do Trabalho", kind: "Feriado", message: "Todo resultado começa com trabalho consistente e bem direcionado." },
  "09-07": { title: "Independência do Brasil", kind: "Feriado", message: "Hoje é feriado nacional. Organize retornos e visitas com antecedência." },
  "10-12": { title: "Nossa Senhora Aparecida", kind: "Feriado", message: "Hoje é feriado nacional. Confirme a disponibilidade dos seus clientes." },
  "10-15": { title: "Dia do Professor", kind: "Data profissional", message: "Uma homenagem a quem abre portas por meio do conhecimento." },
  "10-18": { title: "Dia do Médico", kind: "Data profissional", message: "Uma homenagem a quem dedica a vida ao cuidado de outras pessoas." },
  "11-02": { title: "Finados", kind: "Feriado", message: "Hoje é feriado nacional. Revise a agenda antes de confirmar deslocamentos." },
  "11-15": { title: "Proclamação da República", kind: "Feriado", message: "Hoje é feriado nacional. Confirme o funcionamento de plantões e parceiros." },
  "11-20": { title: "Dia da Consciência Negra", kind: "Feriado", message: "Uma data de reflexão, respeito e valorização da diversidade." },
  "12-25": { title: "Natal", kind: "Feriado", message: "Que o dia seja de presença, gratidão e bons encontros." }
};

export function getSpecialDate(date: Date): SpecialDate | null {
  const key = format(date, "MM-dd");
  return dates[key] ? { key, ...dates[key] } : null;
}

export function getUpcomingSpecialDate(date: Date, days = 45): { date: Date; special: SpecialDate } | null {
  for (let offset = 0; offset <= days; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(candidate.getDate() + offset);
    const special = getSpecialDate(candidate);
    if (special) return { date: candidate, special };
  }
  return null;
}
