import { createClient } from '@/app/lib/supabase/server'
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

  let lotes: { id: string; nome: string }[] = []
  let registros: RegistroCocho[] = []
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
    const [resLotes, resRegistros] = await Promise.all([
      admin.from('lote').select('id, nome').eq('ativo', true).eq('fazenda_id', fazendaId).order('nome'),
      query.limit(100), // Aumentando o limite se houver filtros
    ])
    lotes = resLotes.data || []
    registros = (resRegistros.data ?? []) as unknown as RegistroCocho[]
    error = resRegistros.error
  }

  if (error) console.error('Erro ao buscar cocho:', error)

  const lista = (registros ?? []) as unknown as RegistroCocho[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather">
          🌽 Cocho
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
