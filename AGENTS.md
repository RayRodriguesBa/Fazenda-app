<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> ⚠️ Este arquivo é a fonte de verdade para agentes. O `README.md` está **defasado**
> (fala em Next 15, `middleware.ts`, Node 18, cor `#2d5016`, sem PWA, sem módulos de
> Manejo/Fazendas/Produtos). Siga o `AGENTS.md`.

---

# Contexto do Projeto — Pecuária F3 (`fazenda-app`)

Aplicação web (PWA) de gestão de propriedades rurais: movimentação de gado, análise de
pastejo, manejo sanitário, chuva, cocho, atividades no campo, e cadastros (fazendas,
lotes, piquetes, produtos, usuários).

- **Nome interno do repo / diretório:** `fazenda-app` (originado do projeto "Fazenda Viçosa").
- **Nome exibido ao usuário (PWA, `<title>`, manifest):** **"Pecuária F3"**.
- Multi-fazenda: um mesmo usuário pode ter acesso a várias fazendas e alternar a
  **fazenda ativa** dentro do app. Todos os dados são isolados por `fazenda_id` + RLS.

---

## Como rodar o projeto

```bash
npm install
npm run dev      # dev server → http://localhost:3000
npm run build    # build de produção
npm start        # serve o build
npm run lint     # ESLint (flat config, eslint-config-next)
npx tsc --noEmit # checagem de tipos (não há script dedicado)
```

- **Node.js 20.9+ obrigatório** (Next 16). O `README` diz 18 — ignore.
- **Não há framework de testes instalado** (sem Jest/Vitest/Playwright, sem `npm test`).
  O requisito de "testes de regressão" abaixo ainda não tem infraestrutura — ao criar
  um teste, será preciso montar o runner primeiro.
- `test.js` **não é um teste**: é um script que baixa o schema PostgREST do Supabase e
  grava em `schema.json` (requer `.env.local`). Rode com `node test.js`.

### Variáveis de ambiente (`.env.local` na raiz, não versionado)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # usado só no servidor (admin client)
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16.2.4** (App Router, Turbopack no dev) |
| Runtime | React **19.2.4** + React DOM 19.2.4 |
| Linguagem | TypeScript 5 (`strict`, `moduleResolution: bundler`, alias `@/* → ./*`) |
| Estilo | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` em `app/globals.css`, plugin `@tailwindcss/postcss`) |
| Ícones | `lucide-react` |
| BaaS | Supabase — PostgreSQL + Auth + Storage + Edge Functions |
| Auth SSR | `@supabase/ssr` (sessão via cookies) |
| Planilhas | `exceljs` (parse de `.xlsx` no client, para importar lotes) |
| PWA | `app/manifest.ts` + `public/sw.js` + `app/components/RegisterSW.tsx` |
| Lint | ESLint 9 flat config (`eslint.config.mjs`) |
| Fontes | Geist, Geist Mono, Merriweather (700), Poppins (400/600/700) via `next/font/google` |

---

## Estrutura de pastas (real, atual)

```
fazenda-app/
├── proxy.ts                     # ⚠️ Proteção de rotas — Next 16 renomeou middleware.ts → proxy.ts
├── next.config.ts               # vazio (sem opções)
├── eslint.config.mjs
├── postcss.config.mjs
├── schema.json                  # dump PostgREST — DEFASADO (ver seção Banco de Dados)
├── test.js                      # gerador do schema.json (não é teste)
├── app/
│   ├── layout.tsx               # root layout: fontes, metadata PWA, <RegisterSW/>
│   ├── page.tsx                 # redirect → /login
│   ├── globals.css              # tokens de cor + Tailwind
│   ├── manifest.ts              # Web App Manifest (/manifest.webmanifest)
│   ├── login/page.tsx           # server: se logado → /dashboard; renderiza <LoginForm/>
│   ├── components/
│   │   ├── DashboardNav.tsx     # sidebar (desktop) + header/bottom-nav (mobile) + seletor de fazenda ativa
│   │   ├── LoginForm.tsx
│   │   └── RegisterSW.tsx       # registra /sw.js no client
│   ├── lib/
│   │   ├── lote.ts              # helpers SCD2: hojeISO, resolverLoteKey, resolverLoteVersaoId, registrarVersaoLote
│   │   └── supabase/
│   │       ├── server.ts        # createClient() — SSR cookie-based (Server Components + Route Handlers)
│   │       ├── client.ts        # `supabase` — browser singleton (anon)
│   │       └── admin.ts         # createAdminClient() — service_role, SÓ no servidor
│   ├── api/                     # Route Handlers (BFF). NÃO há GET aqui — leitura é nos Server Components
│   │   ├── auth/login/route.ts          POST
│   │   ├── auth/logout/route.ts         POST
│   │   ├── fazendas/route.ts            POST, PUT           (gestor)
│   │   ├── fazendas/ativa/route.ts      POST — grava cookie httpOnly `fazenda_id`
│   │   ├── lotes/route.ts               POST                (gestor)
│   │   ├── lotes/[id]/route.ts          PUT                 (gestor)  — sem DELETE (usa flag `ativo`)
│   │   ├── lotes/importar/route.ts      POST                (gestor)  — importação em massa
│   │   ├── piquetes/route.ts            POST                (gestor)
│   │   ├── piquetes/[id]/route.ts       PUT                 (gestor)  — sem DELETE (usa flag `ativo`)
│   │   ├── produtos/route.ts            POST                (gestor)
│   │   ├── produtos/[id]/route.ts       PUT, DELETE         (gestor)
│   │   ├── usuarios/route.ts            POST                (gestor)  — via Edge Function `criar-usuario`
│   │   ├── usuarios/[id]/route.ts       PUT, DELETE         (gestor)  — admin client; bloqueia auto-exclusão
│   │   ├── chuva/route.ts               POST                (qualquer autenticado)
│   │   ├── chuva/[id]/route.ts          PUT, DELETE
│   │   ├── cocho/route.ts               POST
│   │   ├── cocho/[id]/route.ts          PUT, DELETE
│   │   ├── movimentacao/route.ts        POST
│   │   ├── movimentacao/[id]/route.ts   PUT, DELETE
│   │   ├── movimentacao/imagem/route.ts       POST, DELETE  — upload/remoção no bucket `piquete_imagens`
│   │   ├── movimentacao/imagem/url/route.ts   POST          — gera signed URL (1h)
│   │   ├── atividades/route.ts          POST                — atividade + N produtos (atividade_produto)
│   │   ├── atividades/[id]/route.ts     PUT, DELETE
│   │   ├── manejo/route.ts              POST                — abre versão de lote (pesagem) e/ou atividades
│   │   ├── manejo/lancamentos/[id]/     ⚠️ DESATIVADA (410) — pode ser apagada
│   │   └── manejo/atividades/[id]/route.ts    PUT, DELETE
│   └── dashboard/
│       ├── layout.tsx           # exige sessão; carrega perfil, lista de fazendas, fazenda ativa (cookie)
│       ├── page.tsx             # home com cards de módulos
│       ├── chuva/              (page.tsx + ChuvaClient.tsx)
│       ├── movimentacao/       (page.tsx + MovimentacaoClient.tsx)
│       ├── manejo/             (page.tsx + ManejoClient.tsx)
│       ├── cocho/              (page.tsx + CochoClient.tsx)
│       ├── atividades/         (page.tsx + AtividadesClient.tsx)
│       ├── produtos/           (page.tsx + ProdutosClient.tsx)          [gestor]
│       ├── lotes/              (page.tsx + LotesClient.tsx)             [gestor] — abas: Lotes / Piquetes / Análise de Pastejo
│       ├── piquete/[id]/       (page.tsx + PastejoDetalheClient.tsx)   — histórico e ciclos de pastejo de um piquete
│       ├── fazendas/           (page.tsx + FazendasClient.tsx)         [gestor]
│       └── usuarios/           (page.tsx + UsuariosClient.tsx + UsuarioForm.tsx) [gestor]
└── public/
    ├── sw.js                    # service worker: network-first, cache `fazenda-v1`
    ├── manifest não aqui (é app/manifest.ts)
    ├── icons/icon-192.png, icons/icon- 512.png
    └── imagens/LogoPecuariaF3.jpeg
```

---

## Arquitetura e padrões (o que respeitar ao editar)

### Server/Client split rígido
- `page.tsx` = **Server Component**. Faz `auth.getUser()`, lê o cookie `fazenda_id`,
  busca dados no Supabase e passa por props. Redireciona (`redirect()`) quando falta
  sessão ou perfil.
- `*Client.tsx` = **Client Component** (`'use client'`). Estado de formulário, validação,
  e `fetch` para `/api/*`. Depois de mutação bem-sucedida chama `router.refresh()`.

### BFF — nenhuma mutação direta client → Supabase
Toda escrita passa por Route Handler em `/api/*`. O client browser (`lib/supabase/client.ts`)
existe mas praticamente não é usado para escrita.

### Três clientes Supabase por contexto
- `server.ts` `createClient()` — Server Components e Route Handlers. Respeita RLS do usuário.
- `client.ts` `supabase` — browser, chave anon.
- `admin.ts` `createAdminClient()` — **service_role, ignora RLS**. Usar só no servidor e
  com parcimônia. Hoje é usado:
  - em `POST /api/fazendas` (problema ovo-galinha: inserir fazenda + vínculo antes de a RLS "ver" o usuário);
  - em `POST /api/usuarios` e `usuarios/[id]` (Auth Admin API + vincular `fazenda_usuario`);
  - em **leituras** de vários `page.tsx` (`movimentacao`, `cocho`, `manejo`, `usuarios`)
    para contornar RLS em `lote`/`piquete`/`perfil`. ⚠️ Ao mexer nessas páginas, mantenha
    sempre o filtro `.eq('fazenda_id', fazendaId)` — o admin client não filtra sozinho.

### Fazenda ativa = cookie, não banco
- Guardada no cookie **httpOnly** `fazenda_id`, gravado por `POST /api/fazendas/ativa`.
- `dashboard/layout.tsx` lê o cookie; se ausente, cai na primeira fazenda ordenada por nome.
- Trocar de fazenda no `DashboardNav` faz `window.location.href = '/dashboard'`
  (reload completo, para resetar todos os Server Components).
- Todo Route Handler de dados lê `cookies().get('fazenda_id')` e retorna
  `400 "Fazenda não selecionada"` se faltar.

### `proxy.ts` (ex-`middleware.ts`)
Next 16 renomeou o arquivo de middleware para `proxy.ts` (export default `proxy`,
mesmo `config.matcher`). O nosso só faz **checagem de sessão**:
- sem sessão + rota `/dashboard/*` → redirect `/login`;
- com sessão + `/login` → redirect `/dashboard`.
`matcher: ['/dashboard/:path*', '/login']`. **Não** verifica perfil/role.

### `lote` é SCD Tipo 2 — leia antes de mexer em qualquer coisa com lote

Desde a migração `20260908_lote_scd2.sql`, **um lote não é uma linha: é várias**.

| Coluna | Papel |
|---|---|
| `lote_key` | chave de **negócio** — igual em todas as versões do mesmo lote |
| `id` | chave **surrogate** de UMA versão — é o que as tabelas de fato referenciam |
| `valido_de` / `valido_ate` | período `[)`; `valido_ate IS NULL` = versão vigente |

Regras que **não** podem ser quebradas:

- **Nunca** dar `UPDATE` direto em `num_animais` / `peso_medio_kg`. Toda pesagem ou
  contagem abre uma versão nova via `registrarVersaoLote()` → RPC `nova_versao_lote`.
- **Fatos** (`movimentacao_gado`, `cocho`, `manejo_atividade`) gravam o `lote_id` da
  versão válida **na data do fato**, resolvido por `resolverLoteVersaoId()`. Nunca
  pegar a versão vigente às cegas.
- **Listas de "lotes atuais"** filtram `.is('valido_ate', null)`.
- **Qualquer agrupamento de fatos por lote** (pareamento de pastejo, piquete atual do
  lote, filtros) usa `lote_key`, nunca `lote_id` — senão uma pesagem no meio de um
  pastejo o parte em dois. As Server Pages montam o mapa `id → lote_key` e enviam
  `lote_key` junto de cada fato.
- **Seletores de lote na UI** têm `value={lote.lote_key}`. As rotas aceitam tanto o id
  de uma versão quanto o `lote_key` — `resolverLoteKey()` normaliza os dois.
- Lançamentos precisam entrar **em ordem cronológica**: `nova_versao_lote` não trata
  retroativo. `registrarVersaoLote()` valida isso e devolve 400 com mensagem clara.
- Campos estáticos (`nome`, `descricao`, `ativo`, `sexo`) são propagados a **todas** as
  versões (`WHERE lote_key = ...`), para que fatos históricos exibam o nome certo.

Helpers em [app/lib/lote.ts](app/lib/lote.ts) — usam o admin client (operador precisa
gravar sem ter escrita em `lote` via RLS), sempre restritos por `fazenda_id`.

### Discriminated unions em formulários
`type Modo = { tipo: 'criar' } | { tipo: 'editar'; registro: Entidade }` — sem flags
`isEditing`/`editingId`.

### Validação
- Bloquear datas futuras e números negativos.
- Botão `submit` desabilitado enquanto faltar campo obrigatório (flag `isValido`
  derivada do estado, sem lib de formulário).

### PWA
- `app/manifest.ts` → `/manifest.webmanifest`, `display: standalone`, `start_url: /dashboard`,
  `theme_color: #1a4731`.
- `public/sw.js`: estratégia **network-first** com fallback ao cache `fazenda-v1`;
  registrado por `RegisterSW` no root layout.
- Ao mudar o SW, **suba a versão do cache** (`CACHE = 'fazenda-vN'`).

---

## RBAC — onde exatamente é verificado

| Camada | O que faz |
|---|---|
| `proxy.ts` | Só sessão (logado/deslogado). |
| `dashboard/layout.tsx` | Carrega `perfil` e passa `isGestor` ao nav. |
| `page.tsx` gestor-only | `produtos`, `lotes`, `fazendas`, `usuarios`, `piquete/[id]` fazem `redirect('/dashboard')` se `perfil.perfil !== 'gestor'`. |
| Route Handlers gestor-only | `fazendas`, `lotes*`, `piquetes*`, `produtos*`, `usuarios*` reconsultam `perfil` e retornam `403` se não for gestor. |
| Route Handlers abertos | `chuva`, `cocho`, `movimentacao`, `atividades`, `manejo` exigem **apenas autenticação** (operador pode registrar). |
| Banco | RLS por `fazenda_id`; RPCs `tem_acesso_fazenda(p_fazenda_id)`, `is_gestor()`, `rls_auto_enable()`. |

### Permissões por perfil

| Ação | Gestor | Operador |
|---|:--:|:--:|
| Criar / editar fazenda | ✅ | ❌ |
| Trocar fazenda ativa | ✅ | ✅ |
| CRUD lote / piquete / produto | ✅ | ❌ |
| Ver lote / piquete / produto | ✅ | ✅ (leitura via RLS / admin client nas telas de lançamento) |
| Importar lotes via Excel | ✅ | ❌ |
| Criar / editar / excluir operadores | ✅ | ❌ |
| Ver operadores da fazenda | ✅ | ❌ |
| Registrar chuva / movimentação / manejo / cocho / atividade | ✅ | ✅ |

---

## Módulos

### Autenticação & usuários
- Login email+senha (`POST /api/auth/login` → `signInWithPassword`).
- 1 perfil global por usuário na tabela `perfil` (`gestor` | `operador`).
- Gestor cria operador via `POST /api/usuarios` → Edge Function **`criar-usuario`**;
  o handler então insere o vínculo `fazenda_usuario` na fazenda ativa (admin client).
- Tela de usuários lista só quem está vinculado à fazenda ativa (`fazenda_usuario`).
- `usuarios/[id]` PUT edita nome (perfil) + email/senha (Auth Admin); DELETE remove do
  Auth e **bloqueia o gestor de excluir a si mesmo**.

### Fazenda
- `POST/PUT /api/fazendas` (gestor). Sem exclusão — campo `ativo`.
- Insert usa admin client + cria vínculo `fazenda_usuario`.

### Lote (SCD Tipo 2 — ver seção de arquitetura acima)
- `POST /api/lotes`, `PUT /api/lotes/[id]` (gestor). Sem DELETE (`ativo`).
- Campos estáticos: `nome`, `descricao`, `sexo`, `ativo` (propagados a todas as versões).
- Campos versionados: `num_animais`, `peso_medio_kg` (mudança abre nova versão).
- `POST` cria a versão 1 com `lote_key = id` e `valido_de = hoje`.
- `PUT` separa os dois grupos: estáticos por `UPDATE ... WHERE lote_key`, versionados
  por `registrarVersaoLote()`.
- **Histórico:** a aba Lotes tem um botão 🕘 por lote que abre a linha do tempo de
  versões (período, nº de animais, peso e delta entre versões consecutivas).
- Nome único por fazenda → erro `23505` vira "Já existe um lote com este nome".
  Depende do índice **parcial** `lote_nome_corrente_uidx` (`WHERE valido_ate IS NULL`),
  criado por `20260909_lote_nome_indice_parcial.sql`. O índice antigo
  `lote_fazenda_id_nome_key` (não-parcial) **quebra o SCD2** — toda versão nova repete
  `(fazenda_id, nome)` e estoura 23505. Se voltar a aparecer, é bug.
- **Importação Excel:** `LotesClient` lê `.xlsx` com `exceljs` no browser, mostra preview
  e envia `{ lotes: [{ nome, sexo, num_animais }] }` para `POST /api/lotes/importar`,
  que deduplica por nome (case-insensitive) contra os lotes existentes da fazenda.

### Piquete
- `POST /api/piquetes`, `PUT /api/piquetes/[id]` (gestor). Sem DELETE (`ativo`).
- Campos: `nome`, `area_ha`, `aproveitamento_pasto` (0–100, opcional), `forrageira`, `ativo`.
- `forrageira`: `Sempre_verde`, `Marandu`, `Bengo`, `Grama`, `Decumbens`.

### Movimentação de Gado
- `POST /api/movimentacao`, `PUT/DELETE /api/movimentacao/[id]` (autenticado).
- Registro de `Entrada`/`Saída` por `lote_id` + `piquete_id` (ambos obrigatórios) e `data`.
- **`quantidade` foi removida do fluxo** — o handler nem grava mais esse campo (coluna
  permanece nullable para dados legados).
- Altura do pasto opcional: `altura1..5` — **tudo ou nada** (5 medições ou nenhuma);
  `media_altura` é calculada pelo banco.
- `qualidade` (do solo) opcional: `Bom`, `Sementado`, `Seco`.
- `foto_url` opcional: foto do piquete. Upload em `POST /api/movimentacao/imagem`
  (bucket `piquete_imagens`, caminho `private/{userId}/piquete_<ts>.<ext>`, ≤ 50 MB,
  JPEG/PNG/WebP/HEIC). Exibição via signed URL (`POST /api/movimentacao/imagem/url`).
- A `page.tsx` deriva: piquete atual de cada lote, piquetes ocupados, e **ranking de
  dias de descanso** por piquete. Aceita filtro `?de=&ate=` (sem filtro → últimos 50).

### Análise de Pastejo (`LotesClient` aba "Análise de Pastejo" + `piquete/[id]`)
- Reconstrói **ciclos de pastejo** (`data_entrada` → `data_saida`, `dias_ocupado`,
  `dias_descanso_previo`) a partir do histórico de `movimentacao_gado`, pareando
  Entradas/Saídas por lote em ordem cronológica.
- Trata dados importados imperfeitos: Entradas abertas "órfãs" (mais antigas que uma
  Saída concluída posterior) são fechadas no mesmo dia; Saídas sem Entrada viram ciclo
  com `data_entrada = '?'`.
- `lotes/page.tsx` **pagina** `movimentacao_gado` de 1000 em 1000 para furar o teto de
  linhas do PostgREST. Não reintroduza `.limit()` simples aqui.
- `piquete/[id]` aceita filtro `?de=&ate=`.

### Manejo de Gado
- **Pesagem/contagem não é mais tabela própria.** `manejo_lancamentos` foi removida na
  migração SCD2 — cada pesagem virou uma **versão de `lote`**.
- Tabelas restantes:
  - `manejo_atividade` — 1 linha por atividade sanitária: `tipo`, `lote_id`, `data`.
  - `manejo_atividade_produto` — N:N atividade ↔ produtos (opcional).
- `POST /api/manejo` aceita `{ lote_id, data, num_animais?, peso_medio_kg?,
  atividades?: [{ tipo, produtos_ids? }] }`. Exige **pelo menos** pesagem **ou** uma
  atividade. Rejeita `tipo` de atividade repetido no mesmo envio. A pesagem roda
  **antes** das atividades, para que elas apontem à versão recém-aberta naquela data.
- `tipo` de atividade de manejo (no client): **`Banho`, `Vermifugo`, `Pour-On`, `Vacina`**
  (distinto dos tipos de "Atividade no Campo"). Os produtos oferecidos são filtrados pela
  `categoria` = `tipo`.
- A tela lista as versões de lote como "Atualizações de Lote" — **somente leitura**
  (histórico imutável; editar/excluir uma versão quebraria os fatos que a referenciam).
  Atividades continuam editáveis em `manejo/atividades/[id]` (replace dos produtos).
- `page.tsx` aceita filtros `?de=&ate=&lote=&tipo=` (`tipo` ∈ `lancamentos`|`atividades`|`todos`);
  `lote` é um `lote_key`, expandido para todos os ids de versão ao filtrar atividades.
- ⚠️ `observacao` e `tipo_pesagem` (`real`/`simulada`) **não têm mais onde ser gravados** —
  `lote` não possui essas colunas. Foram removidos do formulário.

### Atividade no Campo
- `POST /api/atividades`, `PUT/DELETE /api/atividades/[id]` (autenticado).
- **`piquete_id` obrigatório.** `data`, `tipo`, `modalidade` obrigatórios.
- `tipo`: `Adubação`, `Herbicida`, `Roçagem`.
- `modalidade` (no código, para os 3 tipos): **`Manual`, `Trator`**. (O enum do banco
  ainda tem valores legados `Costal/Stihl/Foice/Roçadeira/Enxada` que a UI não usa mais.)
- **Múltiplos produtos** via tabela `atividade_produto` (N:N) com `volume`, `unidade`,
  `quantidade_unidade` por produto:
  - `Herbicida` → ≥ 1 produto **obrigatório**; unidade `Baldes` ou `Jatão`.
  - `Adubação` → produto opcional; unidade `Sacos` ou `Kg`.
  - `Roçagem` → **sem** produtos e sem unidade.
  - `Sacos`/`Baldes` exigem `quantidade_unidade`.
- `PUT` faz replace dos produtos (delete + reinsert). `POST` faz rollback da atividade
  se a inserção dos produtos falhar.
- `AtividadesClient` tem visão **lista** e **calendário** (navegação mês/ano nativa).

### Chuva
- `POST /api/chuva`, `PUT/DELETE /api/chuva/[id]` (autenticado).
- `data`, `volume_mm` (≥ 0), `observacao?`.
- `page.tsx` calcula **"dias sem chuva"** (última `volume_mm > 0`) e média de volume;
  respeita filtro `?de=&ate=`.

### Cocho
- `POST /api/cocho`, `PUT/DELETE /api/cocho/[id]` (autenticado).
- `lote_id`, `data`, `kg` (≥ 0), `observacao?`. Filtro `?de=&ate=` (limite 100).

### Produtos & Categorias
- `POST /api/produtos`, `PUT/DELETE /api/produtos/[id]` (gestor).
- `produto` referencia `categoria_produto` por `categoria_id`. O handler recebe o texto
  `categoria` e resolve para o `id` via `categoria_produto.tipo_atividade == categoria`.
- `ProdutosClient`: cards clicáveis abrem edição em modal.

---

## Banco de Dados

> ⚠️ **`schema.json` está DEFASADO.** Foi gerado antes de vários módulos e **não contém**:
> `manejo_atividade`, `manejo_atividade_produto`, `atividade_produto`,
> `atividade.piquete_id`, `lote.sexo`, `movimentacao_gado.foto_url`,
> `piquete.forrageira` (parcial), nem as colunas SCD2 (`lote_key`, `valido_de`,
> `valido_ate`) ou a função `nova_versao_lote`.
> Para regenerar: `node test.js` (precisa de `.env.local`). Trate o schema real do
> Supabase como fonte de verdade; confirme colunas antes de assumир.

### Tabelas (estado atual esperado)

| Tabela | Colunas-chave | Observações |
|---|---|---|
| `perfil` | `id` (=auth.users.id), `nome`, `perfil` | `perfil` enum `perfil_tipo` |
| `fazenda` | `id`, `nome`, `localizacao`, `criado_por`, `ativo` | sem delete |
| `fazenda_usuario` | `fazenda_id`, `usuario_id` | vínculo N:N usuário↔fazenda |
| `lote` | `id`, `lote_key`, `valido_de`, `valido_ate`, `fazenda_id`, `nome`, `descricao`, `num_animais`, `peso_medio_kg`, `sexo`, `ativo` | **SCD Tipo 2** — várias linhas por lote; `valido_ate IS NULL` = vigente |
| `piquete` | `id`, `fazenda_id`, `nome`, `area_ha`, `aproveitamento_pasto`, `forrageira`, `ativo` | |
| `movimentacao_gado` | `id`, `fazenda_id`, `data`, `lote_id`, `piquete_id`, `tipo_operacao`, `qualidade`, `observacao`, `altura1..5`, `media_altura` (gerada), `foto_url`, `quantidade` (legado) | |
| `cocho` | `id`, `fazenda_id`, `lote_id`, `data`, `kg`, `observacao` | |
| `chuva` | `id`, `fazenda_id`, `data`, `volume_mm`, `observacao` | |
| `atividade` | `id`, `fazenda_id`, `data`, `tipo`, `modalidade`, `piquete_id`, `observacao` | produtos ficam em `atividade_produto` |
| `atividade_produto` | `id`, `atividade_id`, `produto_id`, `volume`, `unidade`, `quantidade_unidade` | N:N |
| `categoria_produto` | `id`, `nome`, `tipo_atividade` | |
| `produto` | `id`, `fazenda_id`, `nome`, `categoria_id`, `ativo` | |
| ~~`manejo_lancamentos`~~ | — | **dropada** na migração SCD2 (confirmado: sem índices no banco); virou versão de `lote` |
| `manejo` | `id`, … | ⚠️ existe no banco mas o app **nunca lê nem escreve** nela — provável resíduo de schema antigo. Se voltar a ser usada, o `lote_id` dela também precisa passar por `resolverLoteVersaoId()`. |
| `manejo_atividade` | `id`, `fazenda_id`, `lote_id`, `data`, `tipo` | `lote_id` = versão válida na data |
| `manejo_atividade_produto` | `id`, `manejo_atividade_id`, `produto_id` | N:N |

### Enums / valores de domínio

| Domínio | Valores usados pelo código |
|---|---|
| `perfil_tipo` | `gestor`, `operador` |
| `tipo_operacao` (movimentação) | `Entrada`, `Saída` |
| `qualidade_solo` | `Bom`, `Sementado`, `Seco` |
| `tipo_atividade` (atividade no campo & `categoria_produto.tipo_atividade`) | `Adubação`, `Herbicida`, `Roçagem` |
| `modalidade_atividade` — **em uso na UI** | `Manual`, `Trator` |
| `modalidade_atividade` — legado no enum do banco | `Costal`, `Stihl`, `Foice`, `Roçadeira`, `Enxada` |
| `unidade_atividade` | `Sacos`, `Kg` (Adubação) · `Baldes`, `Jatão` (Herbicida) |
| presets de quantidade (client) | Adubação-Sacos `25/30/40/50` · Adubação-Kg `5..100` · Herbicida-Baldes `5/10/15/20` · Herbicida-Jatão `100..400` |
| `forrageira` | `Sempre_verde`, `Marandu`, `Bengo`, `Grama`, `Decumbens` |
| `tipo` de atividade de **manejo** | `Banho`, `Vermifugo`, `Pour-On`, `Vacina` |
| ~~`tipo_pesagem`~~ | descontinuado com o SCD2 — não há mais onde gravar |

### Storage
- Bucket **`piquete_imagens`** (privado). Caminho: `private/{userId}/piquete_<timestamp>.<ext>`.
  Acesso sempre via **signed URL** de 1h. RLS do bucket amarra o prefixo ao `userId`;
  o DELETE no handler revalida `path.startsWith('private/{user.id}/')`.

### Edge Functions (Supabase)
- **`criar-usuario`** — cria o usuário no Auth + linha em `perfil`. Chamada de
  `POST /api/usuarios` via `supabase.functions.invoke('criar-usuario', ...)`.
  (Não versionada neste repo — não há pasta `supabase/`.)

---

## Design System

Tokens em `app/globals.css` (`:root` + espelhados em `@theme inline` como `--color-*`):

| Token | Valor atual | Uso |
|---|---|---|
| `--primary` | `#6f6a19` (verde-oliva escuro) | nav, títulos, acentos |
| `--primary-light` | `#7cb342` | |
| `--accent` | `#b8860b` (dourado) | badge "Gestor" |
| `--error` | `#dc2626` | |
| `--text` | `#1f2937` | |
| `--bg` | `#fafafa` | fundo |
| theme-color PWA (`layout.tsx` / `manifest.ts`) | `#1a4731` | barra do SO |

- Classes usadas como `bg-[var(--primary)]`, `text-[var(--primary)]` etc.
- Fontes por classe utilitária: `font-merriweather` (títulos), `font-poppins` (UI/corpo).
- Layout: sidebar fixa `lg:w-64` no desktop; header + bottom-nav no mobile.

---

## Requisitos do projeto (mantidos)

- **RBAC:** dois perfis (`gestor`, `operador`); cadastros só para gestor; proteção em
  `page.tsx` + Route Handlers + RLS (o `proxy.ts` só cobre sessão).
- **Validação rigorosa:** sem datas futuras, sem números negativos; `submit` desabilitado
  sem os obrigatórios.
- **UI + Server Refresh:** após POST/PUT/DELETE OK no client, `router.refresh()`.
- **BFF:** nenhuma mutação client → Supabase direto; tudo por `/api/*`.
- **Testes de regressão:** cada bug corrigido deve ganhar um teste. ⚠️ Ainda **não há
  runner de testes** — configurar antes (sugestão compatível com o stack: Vitest +
  Testing Library; e2e opcional com Playwright).
- **Qualidade antes de `git push`:** rodar `npm run lint` e `npx tsc --noEmit`.
  (O `AGENTS.md` antigo citava SimpleCov/cobertura — é ferramenta Ruby, **não se aplica**
  a este projeto; quando houver testes, medir cobertura com o coverage do Vitest.)

---

## Convenções ao editar

- Módulo novo = par `page.tsx` (server, busca + guarda de acesso) + `XxxClient.tsx`
  (`'use client'`, estado + `fetch` + `router.refresh()`).
- Todo Route Handler de dados: `auth.getUser()` → ler cookie `fazenda_id` → (se
  gestor-only) revalidar `perfil` → validar payload → escrever com `.eq('fazenda_id', …)`
  → tratar erro Supabase com `console.error` + JSON `{ error }` e status adequado.
- Params de rota dinâmica são `Promise` no Next 16: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`.
- `cookies()`, `headers()`, `searchParams` também são assíncronos — sempre `await`.
- Não introduzir `.limit()` ingênuo em queries de `movimentacao_gado` usadas para
  análise de pastejo (paginação é intencional).
- Ao gravar qualquer fato com `lote_id`, passe pelo `resolverLoteVersaoId()`; ao listar
  lotes, filtre `.is('valido_ate', null)`; ao agrupar fatos por lote, use `lote_key`.
- Ao alterar `public/sw.js`, subir `CACHE = 'fazenda-vN'`.
- Antes de assumir uma coluna, confirme no schema real do Supabase (o `schema.json` mente).
- Leia o guia relevante em `node_modules/next/dist/docs/` antes de escrever código de
  framework — esta versão do Next tem breaking changes (ex.: `middleware.ts` → `proxy.ts`).
