import type { SaasMember, SaasPlan } from "./use-saas-admin";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const neutralized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function subscribersCsv(members: SaasMember[], plans: SaasPlan[]) {
  const planById = new Map(plans.map((plan) => [plan.id, plan.name]));
  const header = ["Nome", "Email", "Telefone", "WhatsApp", "CRECI", "Empresa", "Cidade", "Plano", "Status", "Renovacao", "Cadastro"];
  const rows = members.map((member) => [
    member.name,
    member.email,
    member.phone,
    member.whatsapp,
    member.creci,
    member.company,
    member.city,
    planById.get(member.plan_id) ?? "Sem plano",
    member.status,
    member.renewal,
    member.created_at
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}
