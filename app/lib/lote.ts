import { createAdminClient } from '@/app/lib/supabase/admin'

/**
 * Helpers para o modelo SCD Tipo 2 da tabela `lote`.
 *
 * Cada lote tem VÁRIAS linhas (versões):
 *  - `lote_key` — chave de negócio, igual em todas as versões do mesmo lote
 *  - `id`       — chave surrogate de UMA versão (é o que as tabelas de fato referenciam)
 *  - `valido_de` / `valido_ate` — período `[)`; `valido_ate IS NULL` = versão vigente
 *
 * Estas funções usam o admin client (service_role) porque operadores precisam
 * gravar fatos e pesagens sem ter permissão de escrita direta em `lote` via RLS.
 * Por isso TODA consulta aqui é obrigatoriamente restrita por `fazenda_id`.
 * Uso exclusivo no servidor (Route Handlers / Server Components).
 */

/** Data de hoje em `America/Sao_Paulo`, no formato `YYYY-MM-DD`. */
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Resolve a chave de negócio a partir de qualquer referência de lote — o `id` de
 * uma versão específica ou o próprio `lote_key`. Retorna `null` se a referência
 * não pertencer à fazenda informada.
 */
export async function resolverLoteKey(
  loteRef: string,
  fazendaId: string
): Promise<string | null> {
  const admin = createAdminClient()

  const { data: porId } = await admin
    .from('lote')
    .select('lote_key')
    .eq('id', loteRef)
    .eq('fazenda_id', fazendaId)
    .maybeSingle()

  if (porId?.lote_key) return porId.lote_key

  // A referência pode já ser um lote_key (ex.: veio de um filtro de tela).
  const { data: porKey } = await admin
    .from('lote')
    .select('lote_key')
    .eq('lote_key', loteRef)
    .eq('fazenda_id', fazendaId)
    .limit(1)
    .maybeSingle()

  return porKey?.lote_key ?? null
}

/**
 * Devolve o `id` da versão do lote válida na data do fato:
 *   valido_de <= data AND (valido_ate IS NULL OR data < valido_ate)
 *
 * Se o fato for anterior à primeira versão (lançamento retroativo antes do
 * cadastro do lote), cai na versão mais antiga em vez de falhar — o lote existe
 * como entidade, só não havia registro naquela data.
 */
export async function resolverLoteVersaoId(
  loteRef: string,
  dataFato: string,
  fazendaId: string
): Promise<string | null> {
  const loteKey = await resolverLoteKey(loteRef, fazendaId)
  if (!loteKey) return null

  const admin = createAdminClient()

  const { data: versao } = await admin
    .from('lote')
    .select('id')
    .eq('lote_key', loteKey)
    .lte('valido_de', dataFato)
    .or(`valido_ate.is.null,valido_ate.gt.${dataFato}`)
    .order('valido_de', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (versao?.id) return versao.id

  const { data: primeira } = await admin
    .from('lote')
    .select('id')
    .eq('lote_key', loteKey)
    .order('valido_de', { ascending: true })
    .limit(1)
    .maybeSingle()

  return primeira?.id ?? null
}

type ResultadoVersao =
  | { ok: true; id: string }
  | { ok: false; error: string; status: number }

/**
 * Registra uma pesagem/contagem abrindo uma nova versão do lote via
 * `nova_versao_lote`. Substitui o antigo INSERT em `manejo_lancamentos` e
 * qualquer UPDATE direto em `num_animais` / `peso_medio_kg`.
 *
 * A função SQL não trata lançamento retroativo (fecharia a versão vigente com
 * `valido_ate` anterior ao `valido_de`, gerando erro de range no Postgres), então
 * validamos a ordem cronológica aqui para devolver uma mensagem clara.
 */
export async function registrarVersaoLote(
  loteRef: string,
  data: string,
  numAnimais: number | null,
  pesoMedioKg: number | null,
  fazendaId: string
): Promise<ResultadoVersao> {
  const loteKey = await resolverLoteKey(loteRef, fazendaId)
  if (!loteKey) {
    return { ok: false, error: 'Lote não encontrado nesta fazenda', status: 404 }
  }

  const admin = createAdminClient()

  const { data: vigente } = await admin
    .from('lote')
    .select('id, valido_de')
    .eq('lote_key', loteKey)
    .is('valido_ate', null)
    .maybeSingle()

  if (!vigente) {
    return {
      ok: false,
      error: 'Este lote não possui versão vigente. Verifique a migração de dados.',
      status: 409,
    }
  }

  if (data < vigente.valido_de) {
    return {
      ok: false,
      error:
        `Não é possível registrar em ${formatarBR(data)}: já existe uma versão do lote ` +
        `iniciada em ${formatarBR(vigente.valido_de)}. Lançamentos devem seguir a ordem cronológica.`,
      status: 400,
    }
  }

  const { data: novoId, error } = await admin.rpc('nova_versao_lote', {
    p_lote_key: loteKey,
    p_data: data,
    p_num_animais: numAnimais,
    p_peso_medio_kg: pesoMedioKg,
  })

  if (error || !novoId) {
    console.error('Erro em nova_versao_lote:', error)
    return { ok: false, error: 'Erro ao registrar a atualização do lote', status: 500 }
  }

  return { ok: true, id: novoId as string }
}

function formatarBR(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}
