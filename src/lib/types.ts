// Tipos de domínio compartilhados
export type TipoOriginal = "Receita" | "Despesa";
export type TipoEfetivo = "Receita" | "Despesa" | "Transferência" | "Investimento";

export interface Transaction {
  id: string;
  data: string; // ISO date yyyy-mm-dd
  tipo: TipoOriginal;
  tipo_efetivo: TipoEfetivo;
  valor: number;
  categoria: string | null;
  subcategoria: string | null;
  conta: string | null;
  forma_pagto: string | null;
  descricao: string | null;
  status: string | null;
  observacoes: string | null;
  source_file: string | null;
  imported_at: string;
}

export interface ParsedRow {
  data: string;
  tipo: TipoOriginal;
  tipo_efetivo: TipoEfetivo;
  valor: number;
  categoria: string | null;
  subcategoria: string | null;
  conta: string | null;
  forma_pagto: string | null;
  descricao: string | null;
  status: string | null;
  observacoes: string | null;
  dedupe_hash: string;
  // diagnostics
  raw_valor: string;
  invalid?: string; // reason if invalid
}

export const TIPO_EFETIVO_OPTIONS: TipoEfetivo[] = [
  "Receita",
  "Despesa",
  "Transferência",
  "Investimento",
];
