## Plano — Central Financeira v2

Tudo abaixo é incremental. Antes de criar qualquer KPI/gráfico/coluna/tela, verifico o que já existe; se já está implementado, não duplico. Os filtros globais existentes (período + multi-select) continuam sendo a única fonte de filtragem do dashboard, e todo dado novo entra neles automaticamente.

---

### 1. Banco de dados (nova migração Supabase)

Novas tabelas (RLS por `auth.uid()`, GRANTs para `authenticated` + `service_role`):

- `accounts` — `id, user_id, nome, tipo, saldo_inicial numeric, data_inicial date, cor text, status text ('ativa'|'inativa'), archived_at`
- `categories` — `id, user_id, nome, cor, tipo ('Receita'|'Despesa'|'Ambos'), archived_at`
- `subcategories` — `id, user_id, category_id (FK), nome, archived_at`
- `recurrences` — `id, user_id, descricao, valor, tipo, category_id, subcategory_id, account_id, forma_pagto, frequencia ('semanal'|'quinzenal'|'mensal'|'bimestral'|'trimestral'|'semestral'|'anual'), proximo_vencimento date, ativo bool, ultima_geracao date`
- `installments` — `id, user_id, descricao, valor_total, qtd_parcelas, valor_parcela, primeira_data date, account_id, category_id, subcategory_id, status ('ativo'|'quitado'|'cancelado')`
- `installment_items` — `id, installment_id, user_id, numero, data_prevista, valor, transaction_id nullable, status ('pendente'|'pago'|'antecipado'|'cancelado')`

Alterações em `transactions`:
- Adicionar `account_id uuid`, `category_id uuid`, `subcategory_id uuid`, `recurrence_id uuid`, `installment_item_id uuid`, `data_prevista date` (para agendados/futuros), `realizado bool default true`.
- Manter colunas texto atuais (`conta`, `categoria`, `subcategoria`) por compatibilidade com importações antigas; back-fill cria registros em `accounts/categories/subcategories` na 1ª migração a partir dos valores distintos já existentes do usuário.

Trigger de validação (não CHECK) para garantir `valor > 0` e datas válidas.

---

### 2. Camada de domínio (server functions + libs)

Novos arquivos em `src/lib`:
- `accounts.functions.ts`, `categories.functions.ts`, `subcategories.functions.ts`, `recurrences.functions.ts`, `installments.functions.ts` — CRUD + arquivar.
- `projection.ts` — gera série diária/mensal de fluxo previsto somando: saldos iniciais + transações realizadas + recorrências geradas até o horizonte + parcelas pendentes.
- `recurrence-engine.ts` — função `materializeRecurrences(horizonte)` chamada no boot do dashboard e após editar recorrência: gera itens em `transactions` com `realizado=false` até o horizonte (12m) evitando duplicatas via hash `(recurrence_id, data_prevista)`.
- `installment-engine.ts` — ao criar parcelamento, gera N `installment_items` + N `transactions` previstas; quitar/antecipar/cancelar atualiza o item e a transação correspondente.

`finance.ts` ganha:
- `saldoConsolidado(accounts, txs)` = Σ saldo_inicial (ativas) + Σ movimentações realizadas até hoje.
- `taxaPoupanca`, deltas %, já existem — só passam a respeitar contas ativas.

---

### 3. Dashboard (`/`) — adições, sem duplicar

KPIs (verificando o que já existe em `KPICards.tsx`):
- **Já existem:** Saldo do período, Receitas, Despesas, Resultado, Taxa de poupança, Maior categoria, Tickets médios → mantidos.
- **Adicionar:** "Saldo Atual Consolidado" como card hero no topo (saldo inicial das contas ativas + movimentações realizadas até hoje), com breakdown por conta no hover.

Gráficos (verificando `Charts.tsx`):
- **Já existem:** Evolução financeira (área), Fluxo mensal (barras), Categorias (barra h), Participação (donut), Forma de pagamento, Saldo por conta, Top 10 — mantidos.
- **Adicionar:**
  - **Evolução do Patrimônio** (linha) — saldo consolidado ao longo do tempo (diário/semanal/mensal conforme range do filtro).
  - **Distribuição por Categoria — Treemap** (Recharts `<Treemap>`) com hierarquia Categoria→Subcategoria, substitui o donut atual como visão principal (donut vira fallback em telas pequenas).
  - **Evolução por Categoria — Área Empilhada** (`<AreaChart stackId>`).
  - **Fluxo de Caixa Futuro — Forecast** (linha com área sombreada para período futuro), seletor 30/90/365 dias, destaque vermelho para dias com saldo projetado < 0.

Todos respondem ao `FilterBar` existente.

---

### 4. Novas páginas (rotas autenticadas)

- `/accounts` — CRUD de contas + saldo inicial, cor, tipo, ativar/arquivar.
- `/categories` — CRUD categorias + subcategorias aninhadas (sem fixas).
- `/recurrences` — CRUD recorrências, pausar/retomar, botão "gerar agora".
- `/installments` — CRUD parcelamentos, ver parcelas, antecipar/quitar/cancelar.
- `/planning` — visão consolidada de compromissos futuros (30/90/365d): tabela + gráfico forecast + alertas de saldo negativo.

Navegação: sidebar no layout `_authenticated.tsx`.

---

### 5. Lançamentos (`/transactions`) — melhorias

- Adicionar selects (em vez de texto livre) para conta/categoria/subcategoria, populados das novas tabelas. Texto antigo continua aparecendo enquanto `*_id` for null.
- Mostrar badges para origem: "Recorrente", "Parcela X/Y", "Previsto" (quando `realizado=false`).
- Filtro Realizado/Previsto/Todos.

---

### 6. Importação (`/import`) — correção do fluxo de erro

Hoje a linha 4 fica como "erro" e some quando o usuário digita. Mudar para máquina de estados explícita por linha: **Erro → Corrigindo → Validado**.
- Destacar visualmente (vermelho/amarelo/verde).
- Mostrar coluna + motivo (ex.: "Coluna `Valor`: valor parece data (`09/04/1900`)").
- Edição inline revalida com Zod em onChange → estado vira "Corrigindo"; só vira "Validado" após passar todas as regras.
- Botão "Importar" só habilita quando 0 linhas em "Erro" ou "Corrigindo".
- Permitir mapear conta/categoria do CSV para registros existentes em `accounts/categories` (auto-match por nome, fallback para "criar nova").

---

### 7. UX global

- Skeletons já existem; estender para novas páginas.
- Estados vazios amigáveis com CTA (ex.: "Nenhuma conta cadastrada — Adicionar conta").
- Exportação CSV/XLSX já existe em transações; **adicionar export PDF** do dashboard (html2canvas + jsPDF) e export CSV/XLSX em /planning.
- Formatação BRL/pt-BR já padrão.
- Responsivo: grid já adapta; treemap/área usam `ResponsiveContainer`.

---

### 8. Detalhes técnicos

- Novas deps: `jspdf`, `html2canvas` (export PDF). Recharts já cobre Treemap/AreaChart.
- `recurrence-engine` roda client-side ao abrir dashboard (chama server fn `materializeRecurrences`) — barato porque limita pelo `ultima_geracao` da recorrência.
- Realtime: opcional, fora de v2.
- Migração faz back-fill defensivo: cria contas/categorias a partir dos valores únicos já existentes em `transactions` do usuário, preenche FKs, mantém colunas texto.

---

### 9. Ordem de execução

1. Migração (tabelas + back-fill + alterações em `transactions`).
2. Server fns CRUD (accounts, categories, recurrences, installments).
3. Páginas de gerenciamento (`/accounts`, `/categories`).
4. Engines (recurrence, installment) + páginas `/recurrences`, `/installments`.
5. Projeção + página `/planning` + gráfico forecast.
6. Saldo consolidado + treemap + área empilhada no dashboard.
7. Refatorar `/import` para a máquina de estados.
8. Export PDF.

---

### Perguntas antes de partir para o build

1. **Saldos iniciais** — quero criar contas baseadas nos nomes já presentes no CSV (Carteira, BB, Itaú, VR, Investimento, Reserva) com saldo inicial = 0 e você ajusta depois, ou prefere começar com lista vazia e cadastrar manualmente?
2. **Materialização de previstos** — pode gerar transações com `realizado=false` para recorrências/parcelas (até 12 meses à frente)? Isso permite que apareçam no fluxo futuro e em /transactions com filtro.
3. **Treemap vs Donut** — substituir o donut atual pelo treemap ou manter ambos lado a lado?
