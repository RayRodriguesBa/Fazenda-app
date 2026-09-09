import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import PastejoDetalheClient from './PastejoDetalheClient'

export default async function PiqueteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const { id } = await params
  const { de, ate } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value
  if (!fazendaId) redirect('/dashboard')

  const [resPiquete, resMovs, resLotes] = await Promise.all([
    supabase
      .from('piquete')
      .select('id, nome, area_ha, aproveitamento_pasto, forrageira, ativo')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single(),
    supabase
      .from('movimentacao_gado')
      .select('id, data, tipo_operacao, media_altura, altura1, altura2, altura3, altura4, altura5, lote_id, created_at')
      .eq('piquete_id', id)
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: true })
      .order('created_at', { ascending: true }),
    // SCD2: todas as versões — os fatos históricos apontam para ids antigos,
    // então o mapa id → lote_key precisa cobrir o lote inteiro, não só o vigente.
    supabase
      .from('lote')
      .select('id, lote_key, nome')
      .eq('fazenda_id', fazendaId),
  ])

  if (!resPiquete.data) redirect('/dashboard/lotes')

  const versoes = resLotes.data || []

  const loteKeyPorId: Record<string, string> = {}
  for (const v of versoes) loteKeyPorId[v.id] = v.lote_key

  const movimentacoes = (resMovs.data || []).map((m) => ({
    ...m,
    lote_key: loteKeyPorId[m.lote_id] ?? m.lote_id,
  }))

  // Um nome por chave de negócio (o nome é propagado a todas as versões).
  const lotes = Array.from(
    new Map(versoes.map((v) => [v.lote_key, { lote_key: v.lote_key, nome: v.nome }])).values()
  )

  return (
    <PastejoDetalheClient
      piquete={resPiquete.data}
      movimentacoes={movimentacoes}
      lotes={lotes}
      de={de}
      ate={ate}
    />
  )
}
