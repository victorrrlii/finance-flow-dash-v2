# Central Financeira Inteligente

Dashboard executivo de controle financeiro pessoal: importação de extratos (CSV/XLSX), lançamentos, contas, categorias, recorrências (assinaturas), compras parceladas, projeção de fluxo de caixa e insights de saúde financeira.

> Este README foi escrito para ser lido tanto por pessoas quanto por assistentes de IA (ex.: Claude Code, Cursor, Copilot) que precisem entender o projeto rapidamente antes de editar código. Sempre que possível, os caminhos de arquivo são exatos.

---

## Índice

1. [Visão geral e stack](#1-visão-geral-e-stack)
2. [Como rodar localmente](#2-como-rodar-localmente)
3. [Arquitetura](#3-arquitetura)
4. [Banco de dados (Supabase/Postgres)](#4-banco-de-dados-supabasepostgres)
5. ["API" — Server Functions](#5-api--server-functions)
6. [Autenticação e permissões](#6-autenticação-e-permissões)
7. [Rotas / páginas](#7-rotas--páginas)
8. [Componentes](#8-componentes)
9. [Lógica de negócio (`src/lib`)](#9-lógica-de-negócio-srclib)
10. [Estrutura de pastas](#10-estrutura-de-pastas)
11. [Convenções e armadilhas conhecidas](#11-convenções-e-armadilhas-conhecidas)
12. [Scripts disponíveis](#12-scripts-disponíveis)

---

## 1. Visão geral e stack

| Camada                 | Tecnologia                                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| Framework              | React 19 + [TanStack Start](https://tanstack.com/start) (SSR full-stack) |
| Build/dev server       | Vite 7 + Nitro (target de build: Cloudflare)                             |
| Roteamento             | TanStack Router (rotas baseadas em arquivo)                              |
| Dados no cliente       | TanStack Query (cache/mutações)                                          |
| "Backend"              | Server Functions do TanStack Start (RPC tipada, sem REST separado)       |
| Banco de dados / Auth  | Supabase (Postgres + Auth), com Row Level Security                       |
| Validação              | Zod                                                                      |
| UI                     | shadcn/ui (Radix UI + Tailwind CSS v4), lucide-react, framer-motion      |
| Gráficos               | Recharts                                                                 |
| Planilhas              | papaparse (CSV) + xlsx/SheetJS (XLSX)                                    |
| Exportação PDF         | jspdf + html-to-image                                                    |
| Gerenciador de pacotes | Bun                                                                      |

Este projeto foi originalmente gerado pela plataforma **Lovable** (note `@lovable.dev/vite-tanstack-config` no `vite.config.ts`, os arquivos de error-reporting em `src/lib/lovable-error-reporting.ts` e comentários "arquivo gerado automaticamente" em `src/integrations/supabase/*`). Esses arquivos "automaticamente gerados" **não devem ser editados manualmente** — veja a seção 11.

---

## 2. Como rodar localmente

### Pré-requisitos

- [Bun](https://bun.sh) instalado
- Um projeto Supabase (URL + chaves)

### Passos

```bash
# 1. Instalar dependências
bun install

# 2. Configurar variáveis de ambiente (crie um arquivo .env na raiz)
# Veja a tabela abaixo com as chaves necessárias

# 3. Rodar em desenvolvimento
bun run dev

# 4. Build de produção
bun run build

# 5. Preview do build
bun run preview
```

### Variáveis de ambiente (`.env`)

| Variável                        | Uso                                                                                                                                                      | Exposta ao cliente? |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `SUPABASE_URL`                  | URL do projeto Supabase, usada no servidor (server functions, middleware de auth)                                                                        | Não                 |
| `SUPABASE_PUBLISHABLE_KEY`      | Chave pública (anon) usada no servidor para validar tokens de usuário                                                                                    | Não                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Chave de service role — **bypassa RLS**. Necessária para `src/integrations/supabase/client.server.ts` (usada em operações admin, ex. gestão de usuários) | Não                 |
| `SUPABASE_PROJECT_ID`           | ID do projeto Supabase                                                                                                                                   | Não                 |
| `VITE_SUPABASE_URL`             | Mesma URL, mas injetada no bundle do cliente (login/signup via `supabase-js` no browser)                                                                 | Sim                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Mesma chave publishable, para o cliente do browser                                                                                                       | Sim                 |
| `VITE_SUPABASE_PROJECT_ID`      | ID do projeto, para o cliente do browser                                                                                                                 | Sim                 |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser prefixada com `VITE_` — isso a exporia no bundle do navegador. Ela só é lida em `process.env` no servidor.

### Migrações do banco

As migrações SQL estão em `supabase/migrations/` e devem ser aplicadas na instância Supabase (via Supabase CLI, `supabase db push`, ou colando manualmente no SQL editor do painel), na ordem cronológica dos nomes dos arquivos.

---

## 3. Arquitetura

```
┌─────────────────────────────┐
│         Browser (SPA)       │
│  React 19 + TanStack Router │
│  + TanStack Query           │
└─────────────┬────────────────┘
              │  chamadas RPC tipadas (useServerFn)
              │  Authorization: Bearer <access_token>
              ▼
┌─────────────────────────────┐
│  TanStack Start Server       │
│  (SSR + Server Functions)    │
│  src/lib/*.functions.ts      │
│  middleware: requireSupabaseAuth
└─────────────┬────────────────┘
              │  cliente Supabase autenticado
              │  como o usuário (RLS aplicado)
              ▼
┌─────────────────────────────┐
│         Supabase             │
│  Postgres (RLS) + Auth       │
└───────────────────────────────┘
```

Pontos-chave:

- **Não existe uma API REST separada.** A lógica de servidor vive no mesmo projeto, como _server functions_ (`createServerFn` do TanStack Start), chamadas do cliente via `useServerFn(...)`. Isso é o equivalente a "backend" deste projeto.
- **Dois clientes Supabase distintos:**
  - `src/integrations/supabase/client.ts` — cliente do **browser**, chave pública (anon), usado só para Auth (login/signup/sessão) e para o hook `useAuth`.
  - `src/integrations/supabase/client.server.ts` — cliente **admin** (service role), usado apenas dentro de server functions confiáveis, para operações que precisam bypassar RLS (ex.: listar todos os usuários).
  - Dentro das server functions "normais" (transações, contas, categorias etc.), o cliente Supabase usado **não** é nenhum desses dois — é criado dinamicamente pelo middleware `requireSupabaseAuth`, autenticado com o token Bearer do usuário, então as queries respeitam RLS normalmente.
- **Autenticação por Bearer token nas server functions:** o middleware cliente `attachSupabaseAuth` (registrado globalmente em `src/start.ts`) anexa automaticamente o `access_token` da sessão Supabase a toda chamada de server function. Do lado do servidor, `requireSupabaseAuth` extrai esse token, valida via `supabase.auth.getClaims`, e injeta `{ supabase, userId, claims }` no contexto do handler.
- **SSR com tratamento de erro dedicado:** `src/server.ts` envolve o handler padrão do TanStack Start/Nitro para normalizar respostas 500 "engolidas" pelo h3 e renderizar uma página de erro amigável (`src/lib/error-page.ts`).

---

## 4. Banco de dados (Supabase/Postgres)

Esquema definido em 5 migrações SQL (`supabase/migrations/`), aplicadas em ordem. **Todas as tabelas têm Row Level Security (RLS) ativado**, com policies restringindo cada usuário aos seus próprios dados (`auth.uid() = user_id`).

### Tabelas

| Tabela              | Descrição                                                       | Colunas/relações importantes                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transactions`      | Lançamentos financeiros individuais                             | `user_id`, `data`, `tipo` (Receita/Despesa original), `tipo_efetivo` (Receita/Despesa/Transferência/Investimento), `valor`, `categoria`/`subcategoria`/`conta` (texto livre legado), `dedupe_hash` (evita duplicatas de import), `account_id`/`category_id`/`subcategory_id`/`recurrence_id`/`installment_item_id` (FKs adicionadas depois), `realizado` (bool), `data_prevista` |
| `imports`           | Log de cada importação de planilha                              | `file_name`, `rows_imported`, `rows_invalid`, `rows_duplicated`                                                                                                                                                                                                                                                                                                                  |
| `accounts`          | Contas do usuário (corrente, poupança, cartão, investimento...) | `nome` (único por usuário), `tipo`, `saldo_inicial`, `data_inicial`, `cor`, `status` (`ativa`/`inativa`)                                                                                                                                                                                                                                                                         |
| `categories`        | Categorias de lançamento                                        | `nome` (único por usuário), `cor`, `tipo` (Receita/Despesa/Ambos)                                                                                                                                                                                                                                                                                                                |
| `subcategories`     | Subcategorias, filhas de `categories`                           | FK `category_id ON DELETE CASCADE`                                                                                                                                                                                                                                                                                                                                               |
| `recurrences`       | Lançamentos recorrentes (assinaturas, salário, aluguel...)      | `frequencia` (semanal/quinzenal/mensal/bimestral/trimestral/semestral/anual), `proximo_vencimento`, `ativo`                                                                                                                                                                                                                                                                      |
| `installments`      | Compras parceladas                                              | `valor_total`, `qtd_parcelas`, `valor_parcela` (calculado no servidor)                                                                                                                                                                                                                                                                                                           |
| `installment_items` | Cada parcela individual de um `installments`                    | `numero`, `data_prevista`, `valor`, `status` (`pendente`/`pago`/`antecipado`/`cancelado`), `UNIQUE(installment_id, numero)`                                                                                                                                                                                                                                                      |
| `user_roles`        | Papéis de acesso (RBAC simples)                                 | enum `app_role` (`admin`/`user`), `UNIQUE(user_id, role)`                                                                                                                                                                                                                                                                                                                        |

### Segurança (RLS)

- Toda tabela de domínio (`transactions`, `accounts`, `categories`, `subcategories`, `recurrences`, `installments`, `installment_items`, `imports`) tem policies `SELECT/INSERT/UPDATE/DELETE` idênticas no padrão: só o dono (`auth.uid() = user_id`) pode ler/escrever suas próprias linhas.
- `user_roles` é mais restrita: usuários só leem seu próprio papel (ou se forem admin, via função `has_role`); apenas admins podem inserir/atualizar/deletar papéis de outros usuários.
- `has_role(_user_id, _role)` é uma função `SECURITY DEFINER` (roda com privilégios elevados, mas com `search_path` fixo) usada dentro das policies para evitar recursão de RLS. A permissão de `EXECUTE` dessa função foi revogada de `PUBLIC`/`anon`/`authenticated` — só é chamável a partir de dentro de outras policies/funções do Postgres, não diretamente por uma query do cliente.

### Migração com back-fill

A segunda migração (`20260601...`) não só cria as novas tabelas normalizadas (`accounts`, `categories`, `subcategories`, `recurrences`, `installments`, `installment_items`), como também faz **back-fill**: cria registros de `accounts`/`categories`/`subcategories` a partir dos valores de texto livre já existentes em `transactions.conta`/`categoria`/`subcategoria`, e depois popula as novas FKs (`account_id`, `category_id`, `subcategory_id`) nas transações existentes.

### Diagrama simplificado de relações

```
auth.users
   │
   ├── accounts ────────────┐
   ├── categories ──── subcategories
   ├── recurrences (opcional: account_id, category_id, subcategory_id)
   ├── installments ── installment_items
   ├── user_roles
   └── transactions (opcional: account_id, category_id, subcategory_id,
                                recurrence_id, installment_item_id)
```

---

## 5. "API" — Server Functions

Localizadas em `src/lib/*.functions.ts`. Cada uma usa `createServerFn` do TanStack Start, valida entrada com **Zod**, e (exceto casos administrativos) exige o middleware `requireSupabaseAuth`.

### `src/lib/transactions.functions.ts`

| Função                   | Método | O que faz                                                                                                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listTransactions`       | GET    | Lista até 10.000 transações do usuário, ordenadas por data desc                                                                                      |
| `importTransactions`     | POST   | Insere em lote (até 5.000 linhas) via `upsert` com `onConflict: "user_id,dedupe_hash"` e `ignoreDuplicates: true`; registra o resultado em `imports` |
| `createTransaction`      | POST   | Cria lançamento manual (gera `dedupe_hash` sintético)                                                                                                |
| `updateTipoEfetivo`      | POST   | Atualiza apenas o campo `tipo_efetivo` de uma transação                                                                                              |
| `deleteTransaction`      | POST   | Remove uma transação por `id`                                                                                                                        |
| `deleteTransactionsBulk` | POST   | Remove todas ou por intervalo de datas (`scope: "all" \| "range"`)                                                                                   |

### `src/lib/manage.functions.ts`

CRUD completo para **contas**, **categorias/subcategorias**, **recorrências** e **parcelamentos**:

- `listAccounts`, `upsertAccount`, `deleteAccount`
- `listCategories` (retorna categorias + subcategorias juntas), `upsertCategory`, `deleteCategory`, `upsertSubcategory`, `deleteSubcategory`
- `listRecurrences`, `upsertRecurrence`, `deleteRecurrence`
- `listInstallments` (retorna parcelamentos + itens/parcelas), `createInstallment` (calcula `valor_parcela` e gera automaticamente N registros em `installment_items`), `deleteInstallment`, `setParcelStatus`

### `src/lib/users.functions.ts` (administração)

| Função                 | O que faz                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ensureAdminBootstrap` | Se nenhum admin existir ainda no sistema, promove o usuário chamador a admin automaticamente (bootstrap de segurança) |
| `listUsersWithRoles`   | Lista todos os usuários (via `supabaseAdmin.auth.admin.listUsers`) com seus papéis — **restrito a admins**            |
| `setUserRoles`         | Define os papéis de um usuário — **restrito a admins**, e impede a remoção do último admin do sistema                 |

### `src/lib/api/example.functions.ts`

Boilerplate de exemplo deixado pelo template (`getGreeting`), sem uso funcional no app — serve como referência de como escrever uma server function simples.

---

## 6. Autenticação e permissões

- **Método**: email + senha via Supabase Auth (`supabase.auth.signInWithPassword` / `signUp`), tela em `src/routes/login.tsx`.
- **Sessão**: persistida em `localStorage` no browser, com refresh automático de token (`autoRefreshToken: true`).
- **Proteção de rotas**: o layout `src/routes/_authenticated.tsx` usa `beforeLoad` para checar `supabase.auth.getUser()` e redirecionar para `/login` se não autenticado. Todas as páginas do app (exceto login) vivem sob esse layout.
- **Proteção das server functions**: todo handler sensível usa o middleware `requireSupabaseAuth`, que rejeita a chamada se não houver um Bearer token válido — independente do estado da UI.
- **RBAC**: papéis `admin`/`user` na tabela `user_roles`. A página `/users` e as funções de gestão de usuários só funcionam para quem tem papel `admin` (checado tanto no servidor quanto refletido na UI).

---

## 7. Rotas / páginas

Roteamento baseado em arquivo do TanStack Router (`src/routes/`). `routeTree.gen.ts` é **gerado automaticamente** — nunca editar à mão.

| Arquivo                           | URL             | Descrição                                                                                            |
| --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `__root.tsx`                      | (shell)         | HTML shell, `QueryClientProvider`, sincronização de auth, toaster                                    |
| `login.tsx`                       | `/login`        | Login / cadastro                                                                                     |
| `_authenticated.tsx`              | (layout)        | Sidebar + guarda de autenticação, envolve todas as rotas abaixo                                      |
| `_authenticated.index.tsx`        | `/`             | **Dashboard**: KPIs, saldo consolidado, gráficos, calendário financeiro, insights, exportação em PDF |
| `_authenticated.transactions.tsx` | `/transactions` | Tabela de lançamentos, filtros, edição, exclusão em massa, exportação Excel                          |
| `_authenticated.import.tsx`       | `/import`       | Importação de CSV/XLSX com validação linha a linha e correção manual                                 |
| `_authenticated.accounts.tsx`     | `/accounts`     | CRUD de contas                                                                                       |
| `_authenticated.categories.tsx`   | `/categories`   | CRUD de categorias/subcategorias                                                                     |
| `_authenticated.users.tsx`        | `/users`        | Gestão de usuários e papéis (admin)                                                                  |

---

## 8. Componentes

### `src/components/finance/` — componentes de domínio

| Componente                    | Função                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `KPICards.tsx`                | Cartões de indicadores-chave (receita, despesa, saldo, etc.)                                                        |
| `Charts.tsx`                  | Gráficos principais: evolução temporal, forma de pagamento, participação por categoria, saldo por conta, top listas |
| `AdvancedCharts.tsx`          | Treemap de categorias, evolução de categorias ao longo do tempo                                                     |
| `MonthlyBarChart.tsx`         | Receita vs. despesa mensal em barras                                                                                |
| `SaldoConsolidadoHero.tsx`    | Bloco de destaque com o saldo consolidado atual                                                                     |
| `FilterBar.tsx`               | Barra de filtros de período/conta/categoria compartilhada entre páginas                                             |
| `FinancialCalendar.tsx`       | Calendário com vencimentos/lançamentos previstos                                                                    |
| `AssinaturasCard.tsx`         | Lista de recorrências ativas (assinaturas)                                                                          |
| `InsightsPanel.tsx`           | Painel com o score de saúde financeira e alertas comportamentais                                                    |
| `CategoryDrilldownDialog.tsx` | Modal de detalhamento ao clicar em uma categoria                                                                    |
| `NewTransactionDialog.tsx`    | Modal de criação/edição manual de lançamento                                                                        |

### `src/components/ui/` — design system

46 componentes shadcn/ui (Radix UI + Tailwind), estilo `new-york`, cor base `slate` (ver `components.json`): `Button`, `Dialog`, `AlertDialog`, `Table`, `Select`, `Tabs`, `Checkbox`, `Popover`, `Tooltip`, `Skeleton`, `Sonner` (toasts), etc. Alias de import: `@/components/ui/*`.

---

## 9. Lógica de negócio (`src/lib`)

Módulos de lógica pura (sem I/O), testáveis isoladamente:

- **`finance.ts`** — formatação BRL (`fmtBRL`, `fmtBRLShort`), formatação de datas (locale `pt-BR`), definição de períodos de filtro (`hoje`, `7d`, `mtd`, `ytd`, `custom`...), aplicação de filtros sobre transações, cálculo de KPIs, série de saldo diário.
- **`insights.ts`** — cálculo do **score de saúde financeira** (0–100), combinando taxa de economia, reserva de emergência (meses de despesa cobertos) e outros indicadores comportamentais; gera alertas.
- **`projection.ts`** — projeção de fluxo de caixa: saldo consolidado atual + projeção futura considerando `recurrences` (recorrências) e `installment_items` (parcelas pendentes).
- **`parser.ts`** — parser tolerante de planilhas (CSV via papaparse, XLSX via SheetJS). Detecta cabeçalho automaticamente, normaliza valores em formato BRL (`R$ 1.234,56` → `1234.56`) e datas `dd/MM/yyyy`, produz `ParsedRow[]` com diagnóstico de linhas inválidas (`invalid?: string`) para correção manual na tela de importação.
- **`pdf-export.ts`** — exporta um elemento DOM para PDF multi-página em A4 paisagem, usando `html-to-image` (suporta funções de cor modernas como `oklch`/`color-mix`) + `jsPDF`.
- **`types.ts`** — tipos de domínio compartilhados (`Transaction`, `ParsedRow`, `TipoEfetivo`, etc.).
- **`utils.ts`** — helpers genéricos (ex. `cn()` para merge de classes Tailwind).
- **`config.server.ts`** — configuração server-only (exemplo: `getServerConfig()` usado no boilerplate de exemplo).
- **`error-capture.ts` / `error-page.ts` / `lovable-error-reporting.ts`** — infraestrutura de captura e exibição de erros (herdada do template Lovable).

---

## 10. Estrutura de pastas

```
finance-flow-dash-v2/
├── src/
│   ├── components/
│   │   ├── finance/          # componentes de domínio financeiro
│   │   └── ui/                # design system (shadcn/ui)
│   ├── hooks/
│   │   ├── use-auth.ts        # hook de sessão/usuário Supabase
│   │   └── use-mobile.tsx     # detecção de viewport mobile
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # cliente browser (anon key)
│   │       ├── client.server.ts     # cliente admin (service role)
│   │       ├── auth-middleware.ts   # requireSupabaseAuth (server)
│   │       ├── auth-attacher.ts     # attachSupabaseAuth (client)
│   │       └── types.ts             # tipos gerados do schema Supabase
│   ├── lib/
│   │   ├── api/example.functions.ts
│   │   ├── finance.ts, insights.ts, projection.ts, parser.ts, pdf-export.ts
│   │   ├── transactions.functions.ts
│   │   ├── manage.functions.ts
│   │   ├── users.functions.ts
│   │   └── types.ts, utils.ts, config.server.ts, error-*.ts
│   ├── routes/                # rotas baseadas em arquivo (TanStack Router)
│   ├── routeTree.gen.ts       # gerado automaticamente — não editar
│   ├── router.tsx             # criação do router + QueryClient
│   ├── server.ts              # entrada SSR (wrapper de erro)
│   ├── start.ts                # config global do TanStack Start (middlewares)
│   └── styles.css
├── supabase/
│   ├── config.toml
│   └── migrations/            # migrações SQL, em ordem cronológica
├── components.json             # config do shadcn/ui
├── vite.config.ts
├── package.json
└── bunfig.toml
```

---

## 11. Convenções e armadilhas conhecidas

- **Não editar `routeTree.gen.ts`** — é regenerado automaticamente a partir de `src/routes/`.
- **Não editar manualmente os arquivos "automaticamente gerados"** em `src/integrations/supabase/` (`client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`) — eles têm o comentário `// This file is automatically generated. Do not edit it directly.` no topo, normalmente sincronizados pela integração Supabase/Lovable.
- **Convenção de rotas do TanStack Router** (ver `src/routes/README.md`): usar `$param` (sem chaves) para segmentos dinâmicos, `{-$param}` para opcionais, `$` para splat (lido como `_splat`, nunca `*`). Não criar `src/pages/` nem `app/layout.tsx` (convenções de outros frameworks).
- **`vite.config.ts`** já inclui plugins do TanStack Start, React, Tailwind, tsconfig-paths e Nitro via `@lovable.dev/vite-tanstack-config` — não adicionar esses plugins manualmente (duplicaria e quebraria o build).
- **`SUPABASE_SERVICE_ROLE_KEY`** só deve ser usada em server functions confiáveis (`client.server.ts`), nunca no cliente.
- **`dedupe_hash`** em `transactions` é o mecanismo de idempotência da importação — alterar sua geração no parser pode quebrar a deduplicação de importações futuras.
- **`bunfig.toml`** define uma "supply-chain guard" de 24h (pacotes recém-publicados são bloqueados por padrão); exceções precisam ser confirmadas explicitamente antes de adicionar a `minimumReleaseAgeExcludes`.

---

## 12. Scripts disponíveis

| Script           | Comando             | Descrição                                 |
| ---------------- | ------------------- | ----------------------------------------- |
| Dev              | `bun run dev`       | Sobe o servidor de desenvolvimento (Vite) |
| Build            | `bun run build`     | Build de produção                         |
| Build (dev mode) | `bun run build:dev` | Build com `--mode development`            |
| Preview          | `bun run preview`   | Serve o build de produção localmente      |
| Lint             | `bun run lint`      | ESLint                                    |
| Format           | `bun run format`    | Prettier (`--write`)                      |
