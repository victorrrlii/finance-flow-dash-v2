// Parser tolerante para o formato da planilha Controle_Financeiro.
// Suporta CSV (papaparse) e XLSX (sheetjs). Normaliza valores BRL e datas dd/MM/yyyy.
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedRow, TipoEfetivo, TipoOriginal } from "./types";

const HEADER_KEYS = [
  "data",
  "tipo",
  "valor",
  "categoria",
  "subcategoria",
  "conta",
  "forma",
  "descri",
  "status",
];

function normalizeHeader(h: string) {
  return (h ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function rowLooksLikeHeader(cells: string[]): boolean {
  const joined = cells.map(normalizeHeader).join("|");
  return HEADER_KEYS.filter((k) => joined.includes(k)).length >= 5;
}

function parseBRLValue(raw: unknown): { value: number | null; raw: string } {
  if (raw == null) return { value: null, raw: "" };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // sanity: dates from Excel come as serials > 30000 — reject if categoria suggests $
    return { value: Math.round(raw * 100) / 100, raw: String(raw) };
  }
  const s = String(raw).trim();
  if (!s) return { value: null, raw: s };
  // Reject anything that looks like a date string
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return { value: null, raw: s };
  const cleaned = s
    .replace(/r\$\s?/i, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { value: null, raw: s };
  return { value: Math.round(n * 100) / 100, raw: s };
}

function parseDateBR(raw: unknown): string | null {
  if (raw == null) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    let year = Number(y);
    // Normalize malformed years: 2-digit → 20YY; <1900 (typos like "0205" meaning 2025) → 20YY
    if (year < 100) year = 2000 + year;
    else if (year < 1900) year = 2000 + (year % 100);
    const dayNum = Number(d);
    const monthNum = Number(mo);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
    const yyyy = String(year).padStart(4, "0");
    const mm = String(monthNum).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  // ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function normalizeTipo(raw: unknown): TipoOriginal | null {
  const s = normalizeHeader(String(raw ?? ""));
  if (s.startsWith("rec")) return "Receita";
  if (s.startsWith("desp")) return "Despesa";
  return null;
}

// Heurística: aporte/transferência baseado em categoria/conta
function inferTipoEfetivo(
  tipo: TipoOriginal,
  categoria: string | null,
  conta: string | null,
): TipoEfetivo {
  const cat = normalizeHeader(categoria ?? "");
  const cont = normalizeHeader(conta ?? "");
  if (cat === "investimento" || cont === "investimento") return "Investimento";
  if (cat === "reserva" || cont === "reserva") return "Transferência";
  // Mantém o tipo original do CSV — soma de receita/despesa é feita apenas
  // pela coluna "tipo", sem reclassificar por categoria.
  return tipo;
}

async function fileToRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: "",
    });
    return aoa.map((row) =>
      row.map((c) => {
        if (c instanceof Date) {
          const dd = String(c.getDate()).padStart(2, "0");
          const mm = String(c.getMonth() + 1).padStart(2, "0");
          return `${dd}/${mm}/${c.getFullYear()}`;
        }
        return c == null ? "" : String(c);
      }),
    );
  }
  // CSV
  const text = await file.text();
  const res = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return res.data as string[][];
}

export interface ParseResult {
  rows: ParsedRow[];
  invalidCount: number;
  totalRows: number;
  fileName: string;
}

// Hash determinístico simples (djb2) usado para deduplicação
function hashRow(parts: string[]): string {
  let h = 5381;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export async function parseFinanceFile(file: File): Promise<ParseResult> {
  const raw = await fileToRows(file);

  // Localiza linha do cabeçalho
  let headerIdx = raw.findIndex(rowLooksLikeHeader);
  if (headerIdx < 0) headerIdx = 0;
  const header = raw[headerIdx].map(normalizeHeader);

  const idx = {
    data: header.findIndex((h) => h.startsWith("data")),
    tipo: header.findIndex((h) => h === "tipo"),
    valor: header.findIndex((h) => h.startsWith("valor")),
    categoria: header.findIndex((h) => h.startsWith("categoria")),
    subcategoria: header.findIndex((h) => h.startsWith("subcategoria")),
    conta: header.findIndex((h) => h === "conta"),
    forma: header.findIndex((h) => h.startsWith("forma")),
    descricao: header.findIndex((h) => h.startsWith("descri")),
    status: header.findIndex((h) => h.startsWith("status")),
    observacoes: header.findIndex((h) => h.startsWith("observ")),
  };

  const rows: ParsedRow[] = [];
  let invalid = 0;

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every((c) => !String(c ?? "").trim())) continue;

    const tipo = normalizeTipo(r[idx.tipo]);
    const data = parseDateBR(r[idx.data]);
    const { value, raw: rawValor } = parseBRLValue(r[idx.valor]);

    const categoria = (r[idx.categoria] ?? "").toString().trim() || null;
    const subcategoria = (r[idx.subcategoria] ?? "").toString().trim() || null;
    const conta = (r[idx.conta] ?? "").toString().trim() || null;
    const forma_pagto = (r[idx.forma] ?? "").toString().trim() || null;
    const descricao = (r[idx.descricao] ?? "").toString().trim() || null;
    const status = (r[idx.status] ?? "").toString().trim() || null;
    const observacoes = (r[idx.observacoes] ?? "").toString().trim() || null;

    const issues: string[] = [];
    if (!tipo) issues.push("tipo inválido");
    if (!data) issues.push("data inválida");
    if (value == null || value <= 0) issues.push("valor inválido");

    const safeTipo: TipoOriginal = tipo ?? "Despesa";
    const tipo_efetivo = inferTipoEfetivo(safeTipo, categoria, conta);

    const dedupe_hash = hashRow([
      data ?? "",
      String(value ?? ""),
      descricao ?? "",
      conta ?? "",
      categoria ?? "",
      safeTipo,
    ]);

    const row: ParsedRow = {
      data: data ?? "",
      tipo: safeTipo,
      tipo_efetivo,
      valor: value ?? 0,
      categoria,
      subcategoria,
      conta,
      forma_pagto,
      descricao,
      status,
      observacoes,
      dedupe_hash,
      raw_valor: rawValor,
      invalid: issues.length ? issues.join(", ") : undefined,
    };

    if (row.invalid) invalid++;
    rows.push(row);
  }

  return {
    rows,
    invalidCount: invalid,
    totalRows: rows.length,
    fileName: file.name,
  };
}

export function fixInvalidRow(row: ParsedRow, newValor: number): ParsedRow {
  return {
    ...row,
    valor: newValor,
    invalid: undefined,
    raw_valor: String(newValor),
    dedupe_hash: hashRow([
      row.data,
      String(newValor),
      row.descricao ?? "",
      row.conta ?? "",
      row.categoria ?? "",
      row.tipo,
    ]),
  };
}
