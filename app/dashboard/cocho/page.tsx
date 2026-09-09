import { createClient } from '@/app/lib/supabase/server'
import { Wheat } from 'lucide-react'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { cookies } from 'next/headers'
import CochoClient, { type RegistroCocho } from './CochoClient'

export default async function CochoPage(props: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const searchParams = await props.searchParams
  const { de, ate } = searchParams
  const supabase = await createClient()

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let lotes: { id: string; lote_key: string; nome: string }[] = []
  let registros: RegistroCocho[] = []
  let versoesLote: { id: string; lote_key: string }[] = []
  let error = null

  if (fazendaId) {
    let query = supabase
      .from('cocho')
      .select('id, data, kg, observacao, lote_id, lote(nome)')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })

    if (de) query = query.gte('data', de)
    if (ate) query = query.lte('data', ate)

    const admin = createAdminClient()
    const [resLotes, resVersoes, resRegistros] = await Promise.all([
      // SCD2: o seletor lista apenas as versões vigentes de cada lote.
      admin
        .from('lote')
        .select('id, lote_key, nome')
        .eq('ativo', true)
        .is('valido_ate', null)
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      // Todas as versões: mapeiam o lote_id histórico dos registros.
      admin.from('lote').select('id, lote_key').eq('fazenda_id', fazendaId),
      query.limit(100), // Aumentando o limite se houver filtros
    ])
    lotes = resLotes.data || []
    versoesLote = resVersoes.data || []
    registros = (resRegistros.data ?? []) as unknown as RegistroCocho[]
    error = resRegistros.error
  }

  if (error) console.error('Erro ao buscar cocho:', error)

  const loteKeyPorId: Record<string, string> = {}
  for (const v of versoesLote) loteKeyPorId[v.id] = v.lote_key

  const lista = ((registros ?? []) as unknown as RegistroCocho[]).map((r) => ({
    ...r,
    lote_key: loteKeyPorId[r.lote_id] ?? r.lote_id,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          <Wheat className="inline-block mr-2 w-7 h-7 mb-1" /> Cocho
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId 
            ? 'Selecione uma fazenda para continuar.' 
            : de || ate 
              ? `${lista.length} registros no período selecionado`
              : `Últimos ${lista.length} registros`}
        </p>
      </div>

      <CochoClient registros={lista} lotes={lotes ?? []} de={de} ate={ate} />
    </div>
  )
}
