import { format, isValid, parse } from "date-fns";
import { expenseCategories, incomeCategories } from "@/features/finance/finance-utils";

export type StatementImportMode = "card" | "bank";

export type ImportedStatementRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  selected: boolean;
  duplicate: boolean;
};

const categoryRules: Array<{ category: string; terms: string[] }> = [
  { category: "combustível", terms: ["posto", "combust", "shell", "ipiranga", "petrobras"] },
  { category: "estacionamento", terms: ["estacion", "parking", "zona azul"] },
  { category: "pedágio", terms: ["pedagio", "sem parar", "conectcar"] },
  { category: "alimentação", terms: ["restaurante", "lanch", "padaria", "cafe", "ifood", "mercado"] },
  { category: "tráfego pago", terms: ["meta ads", "facebook ads", "google ads", "trafego"] },
  { category: "Instagram", terms: ["instagram"] },
  { category: "portais imobiliários", terms: ["zap imoveis", "vivareal", "olx", "portal"] },
  { category: "telefone", terms: ["vivo", "claro", "tim ", "telefone"] },
  { category: "internet", terms: ["internet", "fibra", "net "] },
  { category: "assinaturas", terms: ["netflix", "spotify", "apple.com", "google one", "assinatura"] },
  { category: "ferramentas", terms: ["canva", "adobe", "software", "openai", "chatgpt"] },
  { category: "fotografia", terms: ["fotograf"] },
  { category: "vídeo", terms: ["video", "capcut"] },
  { category: "impostos", terms: ["imposto", "das ", "receita federal"] },
  { category: "contador", terms: ["contador", "contabilidade"] },
  { category: "MV Broker", terms: ["mv broker"] }
];

export function inferFinancialCategory(description: string, type: "income" | "expense") {
  if (type === "income") {
    const normalized = normalize(description);
    const match = incomeCategories.find((category) => normalized.includes(normalize(category)));
    return match ?? "outro";
  }
  const normalized = normalize(description);
  return categoryRules.find((rule) => rule.terms.some((term) => normalized.includes(normalize(term))))?.category ?? "outros";
}

export async function parseStatementFile(file: File, mode: StatementImportMode) {
  const content = await file.text();
  if (!content.trim()) throw new Error("O arquivo está vazio.");
  return /<STMTTRN>/i.test(content) ? parseOfx(content, mode) : parseDelimited(content, mode);
}

function parseDelimited(content: string, mode: StatementImportMode) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("O extrato precisa ter cabeçalho e pelo menos um lançamento.");
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalize);
  const dateIndex = findHeader(headers, ["data", "data compra", "data lancamento", "date"]);
  const descriptionIndex = findHeader(headers, ["descricao", "estabelecimento", "historico", "lancamento", "memo", "title"]);
  const amountIndex = findHeader(headers, ["valor", "valor rs", "amount", "total"]);
  const debitIndex = findHeader(headers, ["debito", "saida", "despesa"]);
  const creditIndex = findHeader(headers, ["credito", "entrada", "receita"]);
  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
    throw new Error("Não encontrei as colunas de data, descrição e valor. Exporte o extrato em CSV com esses cabeçalhos.");
  }

  return lines.slice(1).flatMap((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const date = parseStatementDate(cells[dateIndex]);
    const description = String(cells[descriptionIndex] ?? "").trim();
    const debit = debitIndex >= 0 ? parseMoney(cells[debitIndex]) : 0;
    const credit = creditIndex >= 0 ? parseMoney(cells[creditIndex]) : 0;
    const raw = amountIndex >= 0 ? parseMoney(cells[amountIndex]) : credit ? credit : -Math.abs(debit);
    if (!date || !description || !raw) return [];
    const type = resolveType(mode, raw, debit, credit);
    return [buildRow(`${index}-${date}-${Math.abs(raw)}`, date, description, Math.abs(raw), type)];
  });
}

function parseOfx(content: string, mode: StatementImportMode) {
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const rows = blocks.flatMap((block, index) => {
    const read = (tag: string) => block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
    const date = parseStatementDate(read("DTPOSTED"));
    const raw = parseMoney(read("TRNAMT"));
    const description = [read("NAME"), read("MEMO")].filter(Boolean).join(" - ") || "Movimento importado";
    if (!date || !raw) return [];
    const type = resolveType(mode, raw, raw < 0 ? Math.abs(raw) : 0, raw > 0 ? raw : 0);
    return [buildRow(`${index}-${date}-${Math.abs(raw)}`, date, description, Math.abs(raw), type)];
  });
  if (!rows.length) throw new Error("Não encontrei movimentações válidas neste arquivo OFX.");
  return rows;
}

function buildRow(id: string, date: string, description: string, amount: number, type: "income" | "expense"): ImportedStatementRow {
  return { id, date, description, amount, type, category: inferFinancialCategory(description, type), selected: true, duplicate: false };
}

function resolveType(mode: StatementImportMode, raw: number, debit: number, credit: number): "income" | "expense" {
  if (mode === "card") return "expense";
  if (credit > 0 && !debit) return "income";
  if (debit > 0 && !credit) return "expense";
  return raw < 0 ? "expense" : "income";
}

function detectDelimiter(header: string) {
  const choices = [";", ",", "\t"];
  return choices.sort((a, b) => header.split(b).length - header.split(a).length)[0];
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function findHeader(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.some((alias) => header === alias || header.includes(alias)));
}

function parseStatementDate(value: string) {
  const clean = String(value ?? "").trim().slice(0, 10);
  const patterns = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yy", "yyyyMMdd"];
  for (const pattern of patterns) {
    const parsed = parse(clean, pattern, new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }
  return "";
}

function parseMoney(value: string) {
  const raw = String(value ?? "").trim().replace(/R\$|\s/g, "").replace(/[()]/g, (match) => (match === "(" ? "-" : ""));
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: string) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export const statementExpenseCategories = expenseCategories;
export const statementIncomeCategories = incomeCategories;
