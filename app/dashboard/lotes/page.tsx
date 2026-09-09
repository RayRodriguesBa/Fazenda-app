import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import LotesClient, { type Lote, type Piquete, type VersaoLote } from './LotesClient'

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

type LinhaVersao = {
  id: string
  lote_key: string
  nome: string
  descricao: string | null
  num_animais: number | null
  peso_medio_kg: number | null
  sexo: string | null
  ativo: boolean
  valido_de: string
  valido_ate: string | null
}

/** Monta a linha do tempo de cada lote, com o delta entre versões consecutivas. */
function montarHistorico(linhas: LinhaVersao[]): VersaoLote[] {
  const porLote = new Map<string, LinhaVersao[]>()
  for (const l of linhas) {
    const lista = porLote.get(l.lote_key) ?? []
    lista.push(l)
    porLote.set(l.lote_key, lista)
  }

  const resultado: VersaoLote[] = []

  for (const lista of porLote.values()) {
    lista.sort((a, b) => a.valido_de.localeCompare(b.valido_de))

    lista.forEach((v, i) => {
      const anterior = i > 0 ? lista[i - 1] : null
      resultado.push({
        id: v.id,
        lote_key: v.lote_key,
        valido_de: v.valido_de,
        valido_ate: v.valido_ate,
        num_animais: v.num_animais,
        peso_medio_kg: v.peso_medio_kg,
        isInicial: i === 0,
        isVigente: v.valido_ate === null,
        deltaAnimais:
          anterior && v.num_animais != null && anterior.num_animais != null
            ? v.num_animais - anterior.num_animais
            : null,
        deltaPeso:
          anterior && v.peso_medio_kg != null && anterior.peso_medio_kg != null
            ? Number((v.peso_medio_kg - anterior.peso_medio_kg).toFixed(1))
            : null,
      })
    })
  }

  return resultado.sort((a, b) => b.valido_de.localeCompare(a.valido_de))
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
  let historicoLotes: VersaoLote[] = []
  let piquetes: Piquete[] = []
  let movimentacoes: any[] = []

  if (fazendaId) {
    const [resVersoes, resPiquetes, allMovs] = await Promise.all([
      // SCD2: busca TODAS as versões — as vigentes viram a lista, o conjunto
      // completo vira o histórico e o mapa id → lote_key dos fatos.
      supabase
        .from('lote')
        .select('id, lote_key, nome, descricao, num_animais, peso_medio_kg, sexo, ativo, valido_de, valido_ate')
        .eq('fazenda_id', fazendaId)
        .order('valido_de', { ascending: true }),
      supabase
        .from('piquete')
        .select('id, nome, area_ha, aproveitamento_pasto, forrageira, ativo')
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      fetchAllMovimentacoes(supabase, fazendaId),
    ])

    const versoes = (resVersoes.data || []) as LinhaVersao[]

    lotes = versoes
      .filter((v) => v.valido_ate === null)
      .map((v) => ({
        id: v.id,
        lote_key: v.lote_key,
        nome: v.nome,
        descricao: v.descricao,
        num_animais: v.num_animais,
        peso_medio_kg: v.peso_medio_kg,
        sexo: v.sexo,
        ativo: v.ativo,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    historicoLotes = montarHistorico(versoes)

    const loteKeyPorId: Record<string, string> = {}
    for (const v of versoes) loteKeyPorId[v.id] = v.lote_key

    // Os fatos referenciam ids de versão; o pareamento de pastejo precisa da
    // chave de negócio, senão uma pesagem no meio de um pastejo o partiria em dois.
    movimentacoes = allMovs.map((m) => ({
      ...m,
      lote_key: loteKeyPorId[m.lote_id] ?? m.lote_id,
    }))

    piquetes = resPiquetes.data || []
  }

  return (
    <LotesClient
      lotes={lotes}
      historicoLotes={historicoLotes}
      piquetes={piquetes}
      movimentacoes={movimentacoes}
      isGestor={true}
      fazendaId={fazendaId}
    />
  )
}
