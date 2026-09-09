import { createClient } from '@/app/lib/supabase/server'
import { PawPrint } from 'lucide-react'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { cookies } from 'next/headers'
import MovimentacaoClient, { Movimentacao, type PiqueteDescanso } from './MovimentacaoClient'

export default async function MovimentacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const params = await searchParams
  const de = params.de
  const ate = params.ate
  const supabase = await createClient()

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let lotes: { id: string; lote_key: string; nome: string }[] = []
  let piquetes: { id: string; nome: string }[] = []
  let registros: Movimentacao[] = []
  let historico: { lote_id: string; piquete_id: string; tipo_operacao: string; data: string; created_at: string }[] = []
  let versoesLote: { id: string; lote_key: string }[] = []
  let error = null

  if (fazendaId) {
    const admin = createAdminClient()
    const [resLotes, resVersoes, resPiquetes, resRegistros, resHistorico] = await Promise.all([
      // SCD2: o seletor lista apenas as versões vigentes de cada lote.
      admin
        .from('lote')
        .select('id, lote_key, nome')
        .eq('ativo', true)
        .is('valido_ate', null)
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      // Todas as versões: usadas para mapear o lote_id histórico dos fatos.
      admin
        .from('lote')
        .select('id, lote_key')
        .eq('fazenda_id', fazendaId),
      admin
        .from('piquete')
        .select('id, nome')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      (() => {
        let q = supabase
          .from('movimentacao_gado')
          .select('id, data, tipo_operacao, qualidade, media_altura, altura1, altura2, altura3, altura4, altura5, observacao, lote_id, piquete_id, foto_url, lote(nome), piquete(nome)')
          .eq('fazenda_id', fazendaId)
          .order('data', { ascending: false })
        if (de) q = q.gte('data', de)
        if (ate) q = q.lte('data', ate)
        else q = q.limit(50)
        return q
      })(),
      supabase
        .from('movimentacao_gado')
        .select('lote_id, piquete_id, tipo_operacao, data, created_at')
        .eq('fazenda_id', fazendaId)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    lotes = resLotes.data || []
    versoesLote = resVersoes.data || []
    piquetes = resPiquetes.data || []
    registros = (resRegistros.data ?? []) as unknown as Movimentacao[]
    historico = resHistorico.data || []
    error = resRegistros.error
  }

  if (error) console.error('Erro ao buscar movimentações:', error)

  // SCD2: um mesmo lote tem vários ids ao longo do tempo. Tudo que agrupa fatos
  // por lote precisa usar a chave de negócio, não o id da versão.
  const loteKeyPorId: Record<string, string> = {}
  for (const v of versoesLote) loteKeyPorId[v.id] = v.lote_key

  const lista = ((registros ?? []) as unknown as Movimentacao[]).map((r) => ({
    ...r,
    lote_key: loteKeyPorId[r.lote_id] ?? r.lote_id,
  }))

  const piqueteAtualPorLote: Record<string, string> = {}
  const processedLotes = new Set<string>()
  const piquetesOcupados = new Set<string>()

  for (const mov of historico ?? []) {
    const loteKey = loteKeyPorId[mov.lote_id] ?? mov.lote_id
    if (!processedLotes.has(loteKey)) {
      processedLotes.add(loteKey)
      piqueteAtualPorLote[loteKey] = mov.piquete_id
      if (mov.tipo_operacao === 'Entrada') {
        piquetesOcupados.add(mov.piquete_id)
      }
    }
  }

  // Última movimentação por piquete (para ranking de descanso)
  const ultimaMovPorPiquete: Record<string, { data: string; tipo_operacao: string }> = {}
  for (const mov of historico ?? []) {
    if (!ultimaMovPorPiquete[mov.piquete_id]) {
      ultimaMovPorPiquete[mov.piquete_id] = { data: mov.data, tipo_operacao: mov.tipo_operacao }
    }
  }

  const hoje = new Date()
  const rankingDescanso: PiqueteDescanso[] = piquetes
    .filter((p) => ultimaMovPorPiquete[p.id]?.tipo_operacao === 'Saída')
    .map((p) => {
      const dataUlm = new Date(ultimaMovPorPiquete[p.id].data)
      const diasDescanso = Math.floor((hoje.getTime() - dataUlm.getTime()) / (1000 * 60 * 60 * 24))
      return { piquete_id: p.id, nome: p.nome, diasDescanso }
    })
    .sort((a, b) => b.diasDescanso - a.diasDescanso)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          <PawPrint className="inline-block mr-2 w-7 h-7 mb-1" /> Movimentação de Gado
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId ? 'Selecione uma fazenda para continuar.' : `Últimos ${lista.length} registros`}
        </p>
      </div>

      <MovimentacaoClient
        movimentacoes={lista}
        lotes={lotes}
        piquetes={piquetes}
        piqueteAtualPorLote={piqueteAtualPorLote}
        piquetesOcupados={Array.from(piquetesOcupados)}
        rankingDescanso={rankingDescanso}
        de={de}
        ate={ate}
      />
    </div>
  )
}
