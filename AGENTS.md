<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto do Projeto: Fazenda Viçosa (fazenda-app)

## Features do Sistema — Fazenda App v5

### 🔄 Features Adaptadas & Novas Implementações

**Autenticação & Vínculo Usuário ↔ Fazenda**
- Login com email e senha.
- Perfil global único por usuário (gestor ou operador).
- Gestor cria operadores via Edge Function (`criar-usuario` no Supabase).
- Novos operadores são vinculados automaticamente à fazenda ativa.
- Lista de usuários filtrada por fazenda (Gestor vê apenas membros da fazenda ativa).

**Fazenda**
- Criar fazenda — só gestor.
- Editar fazenda (nome, localização).
- Listar fazendas do usuário.
- Trocar de fazenda ativa — usuário alterna entre fazendas no app.
- Dados completamente isolados entre fazendas via `fazenda_id` e RLS.

**Lote**
- CRUD completo (só gestor).
- Campos: nome, descrição, número de animais, peso médio, ativo.
- Isolado por fazenda (`fazenda_id` obrigatório).
- Operadores têm permissão para visualizar lotes da fazenda (Acesso RLS corrigido).
- **Importação de Dados:** Gestor pode fazer upload de planilhas Excel (.xlsx) usando *ExcelJS* no client para pré-visualizar e importar lotes em massa para a fazenda atual.

**Piquete**
- CRUD completo (só gestor).
- Campos: nome, área (ha), ativo, aproveitamento do pasto (percentual 0–100%, opcional).
- **Forrageira:** Adicionado rastreamento do tipo de forrageira (Sempre_verde, Marandu, Bengo, Grama, Decumbens).
- Isolado por fazenda (`fazenda_id` obrigatório).

**Movimentação de Gado**
- Registro de entrada e saída por lote e piquete.
- **Quantidade Removida:** A quantidade de animais deixou de ser obrigatória na movimentação.
- Altura do pasto opcional — 5 medições + média calculada automaticamente pelo banco.
- Qualidade do solo opcional (Bom, Sementado, Seco).
- Isolado por fazenda (`fazenda_id` obrigatório).

**Manejo de Gado (Novo)**
- Registro independente de manejos sanitários e procedimentos do rebanho.
- Permite vincular *múltiplas atividades de manejo* (ex: aplicação de vermífugo, vacina, banho) num único registro.
- Vinculação opcional de produtos a cada atividade do manejo.
- Isolado por fazenda (`fazenda_id` obrigatório).

**Chuva**
- Registro de data, volume (mm) e observação.
- Isolado por fazenda (`fazenda_id` obrigatório).

**Cocho**
- Registro de kg por lote e data.
- Adicionado sistema de filtros de registros baseado em períodos (datas/meses).
- Isolado por fazenda (`fazenda_id` obrigatório).

**Atividade no Campo**
- Formulário utilizando calendário interativo nativo para navegação mês/ano.
- **Piquete Obrigatório:** Exige seleção de um piquete alvo.
- Fluxo condicional de negócio e **Múltiplos Produtos**: 
  - Um registro de atividade suporta múltiplos produtos através de tabela associativa `atividade_produto` (relacionamento N:N).
  - Adubação e Herbicida aceitam a inclusão de produtos.
  - Roçagem **não** aceita produtos.
- Isolado por fazenda (`fazenda_id` obrigatório).

**Produtos e Categorias Dinâmicas**
- Produtos agora apontam corretamente para a tabela `categoria_produto`.
- Tabela dinâmica gerenciada pelo gestor.
- Listagem baseada em Cards clicáveis que abrem modal/edição para rápida atualização.
- **Novas Categorias Suportadas:** Ampliação do catálogo. Adição de "Banho", "Pour on", "Vermifugo", e "Vacina", além de Adubação, Herbicida e Roçagem.

### 🔐 Permissões por Perfil

| Feature | Gestor | Operador |
|---|---|---|
| Criar fazenda | ✅ | ❌ |
| Editar fazenda | ✅ | ❌ |
| Trocar fazenda ativa | ✅ | ✅ |
| CRUD lote | ✅ | ❌ |
| Ver lote | ✅ | ✅ |
| Importar lotes via Excel | ✅ | ❌ |
| CRUD piquete | ✅ | ❌ |
| Ver piquete | ✅ | ✅ |
| CRUD produtos | ✅ | ❌ |
| Ver produtos | ✅ | ✅ |
| Criar operadores na fazenda | ✅ | ❌ |
| Ver operadores da fazenda | ✅ | ❌ |
| Registrar chuva | ✅ | ✅ |
| Registrar movimentação de gado | ✅ | ✅ |
| Registrar manejo de gado | ✅ | ✅ |
| Registrar cocho | ✅ | ✅ |
| Registrar atividade no campo | ✅ | ✅ |

### 🗄️ Enums e Tipos de Domínio

| Domínio | Valores Esperados |
|---|---|
| `perfil_tipo` | gestor, operador |
| `tipo_operacao` | Entrada, Saída |
| `tipo_atividade` | Adubação, Herbicida, Roçagem |
| `modalidade_atividade` | Manual, Trator, Costal, Stihl, Foice, Roçadeira, Enxada |
| `unidade_atividade` | Sacos, Kg, Baldes, Jatão |
| `qualidade_solo` | Bom, Sementado, Seco |
| `categoria_produto` | Adubação, Herbicida, Roçagem, Banho, Pour on, Vermifugo, Vacina |
| `forrageira` | Sempre_verde, Marandu, Bengo, Grama, Decumbens |

## Requisitos do Projeto
- **Controle de Acesso (RBAC):** Dois perfis (`gestor` e `operador`). Módulos de cadastro acessíveis apenas a gestores. Proteção via Middleware, Route Handlers e RLS no banco de dados.
- **Validação Rigorosa:** Bloqueio de datas futuras e de inputs negativos. Botão de "Salvar" (`submit`) deve permanecer desabilitado se os dados obrigatórios não forem preenchidos.
- **UI Otimista / Server Refresh:** Após qualquer mutação (POST/PUT/DELETE) bem sucedida no client, chamar `router.refresh()` para refletir instantaneamente a atualização no banco.
- **Backend For Frontend (BFF):** Nenhuma mutação é feita diretamente do client para o Supabase. Todas as operações passam por Route Handlers (`/api/*`).

## Tecnologias Usadas
- **Framework:** Next.js 16.2.4 (App Router)
- **Linguagem:** TypeScript 5
- **UI:** React 19 + Tailwind CSS 4
- **Banco de Dados / BaaS:** Supabase (PostgreSQL, Auth e Edge Functions)
- **Autenticação e Sessão:** `@supabase/ssr` (baseado em cookies SSR)
- **Utilitários:** `exceljs` para leitura e preview de planilhas.

## Design System
- Desenvolvido utilizando as novas diretrizes do Tailwind CSS v4, com o escopo configurado em `@theme inline` dentro do `app/globals.css`.
- **Cores do Tema:**
  - `--primary`: `#2d5016` (Verde escuro)
  - `--primary-light`: `#7cb342` (Verde claro)
  - `--accent`: `#b8860b` (Dourado/Amarelo)
  - `--error`: `#dc2626` (Vermelho)
  - `--text`: `#1f2937` (Cinza escuro)
  - `--bg`: `#fafafa` (Cinza claro para fundos)
- **Tipografia:** Definida globalmente (Geist, Merriweather, Poppins).

## Padrões de Projeto e Arquitetura
- **Server/Client Split Rigoroso:**
  - `page.tsx`: *Server Components*. Buscam os dados no servidor e passam via props (proteção das chaves, maior segurança).
  - `*Client.tsx`: *Client Components*. Tratam estado (formulários, interações) e as chamadas via `fetch` para a API (BFF).
- **Clientes do Supabase por Contexto:**
  - `server.ts`: Cliente para Server Components e Route Handlers. Usa Cookies para preservar a autenticação.
  - `client.ts`: Cliente anon/public para o Client (quando necessário).
  - `admin.ts`: Apenas em endpoints internos restritos que exigem `service_role`.
- **Discriminadores em Tipagem:** Para formulários de CRUD, uso do padrão Discriminant Union: `{ tipo: 'criar' } | { tipo: 'editar'; registro: Entidade }`. Isso previne inconsistências de estado.
