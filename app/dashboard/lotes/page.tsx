import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import LotesClient, { type Lote, type Piquete } from './LotesClient'

async function fetchAllMovimentacoes(supabase: Awaited<ReturnType<typeof createClient>>, fazendaId: string) {
  const PAGE_SIZE = 1000
  const allMovs: any[] = []
  let page = 0

  while (true) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data } = await supabase
      .from('movimentacao_gado')
      .select('id, data, tipo_operacao, media_altura, lote_id, piquete_id, created_at')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to)

    allMovs.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    page++
  }

  return allMovs
}

export default async function LotesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfil')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (perfil?.perfil !== 'gestor') redirect('/dashboard')

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let lotes: Lote[] = []
  let piquetes: Piquete[] = []
  let movimentacoes: any[] = []

  if (fazendaId) {
    const [resLotes, resPiquetes, allMovs] = await Promise.all([
      supabase
        .from('lote')
        .select('id, nome, descricao, num_animais, peso_medio_kg, sexo, ativo')
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      supabase
        .from('piquete')
        .select('id, nome, area_ha, aproveitamento_pasto, forrageira, ativo')
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      fetchAllMovimentacoes(supabase, fazendaId),
    ])

    lotes = (resLotes.data || []) as Lote[]
    piquetes = resPiquetes.data || []
    movimentacoes = allMovs
  }

  return (
    <LotesClient
      lotes={lotes}
      piquetes={piquetes}
      movimentacoes={movimentacoes}
      isGestor={true}
      fazendaId={fazendaId}
    />
  )
}

