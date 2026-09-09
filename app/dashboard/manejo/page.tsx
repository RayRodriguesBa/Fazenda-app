import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { cookies } from 'next/headers'
import ManejoClient, { type Produto, type Lote, type VersaoLote, type RegistroAtividade } from './ManejoClient'

type LinhaVersao = {
  id: string
  lote_key: string
  nome: string
  num_animais: number | null
  peso_medio_kg: number | null
  valido_de: string
  valido_ate: string | null
}

/**
 * Converte as versões brutas de `lote` (SCD2) na linha do tempo de pesagens que a
 * tela exibe. O delta é calculado sobre TODAS as versões e só depois o período é
 * filtrado, para que a primeira linha visível não perca a comparação anterior.
 */
function montarVersoes(linhas: LinhaVersao[]): VersaoLote[] {
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
        lote_nome: v.nome,
        data: v.valido_de,
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

  return resultado
}

export default async function ManejoPage(props: {
  searchParams: Promise<{ de?: string; ate?: string; lote?: string; tipo?: string }>
}) {
  const searchParams = await props.searchParams
  const { de, ate, lote, tipo } = searchParams

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let lotes: Lote[] = []
  let produtos: Produto[] = []
  let versoes: VersaoLote[] = []
  let atividades: RegistroAtividade[] = []

  // Determinar o que buscar com base no filtro de tipo
  const buscarLancamentos = !tipo || tipo === 'lancamentos' || tipo === 'todos'
  const buscarAtividades = !tipo || tipo === 'atividades' || tipo === 'todos'

  if (fazendaId) {
    const admin = createAdminClient()

    // SCD2: todas as versões de lote da fazenda. Servem para três coisas:
    // o seletor (só as vigentes), a linha do tempo de pesagens, e o mapeamento
    // do lote_id histórico das atividades de volta para a chave de negócio.
    const { data: linhasVersao } = await admin
      .from('lote')
      .select('id, lote_key, nome, num_animais, peso_medio_kg, valido_de, valido_ate, ativo')
      .eq('fazenda_id', fazendaId)

    const todasVersoes = (linhasVersao ?? []) as (LinhaVersao & { ativo: boolean })[]

    lotes = todasVersoes
      .filter((v) => v.valido_ate === null && v.ativo)
      .map((v) => ({
        id: v.id,
        lote_key: v.lote_key,
        nome: v.nome,
        num_animais: v.num_animais,
        peso_medio_kg: v.peso_medio_kg,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    const loteKeyPorId: Record<string, string> = {}
    for (const v of todasVersoes) loteKeyPorId[v.id] = v.lote_key

    // O filtro de lote chega como lote_key; as atividades apontam para ids de versão.
    const idsDoLoteFiltrado = lote
      ? todasVersoes.filter((v) => v.lote_key === lote).map((v) => v.id)
      : null

    let queryAtividades = supabase
      .from('manejo_atividade')
      .select('id, data, tipo, lote_id, lote(nome)')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })

    if (de) queryAtividades = queryAtividades.gte('data', de)
    if (ate) queryAtividades = queryAtividades.lte('data', ate)
    if (idsDoLoteFiltrado) queryAtividades = queryAtividades.in('lote_id', idsDoLoteFiltrado)

    const [resProdutos, resAtividades] = await Promise.all([
      admin
        .from('produto')
        .select('id, nome, ativo, categoria_produto(tipo_atividade)')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId),
      buscarAtividades ? queryAtividades.limit(100) : Promise.resolve({ data: [], error: null }),
    ])

    if (resProdutos.data) {
      produtos = resProdutos.data.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria_produto?.tipo_atividade || (Array.isArray(p.categoria_produto) ? p.categoria_produto[0]?.tipo_atividade : 'Desconhecida')
      })).sort((a: any, b: any) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
    }

    atividades = ((resAtividades.data ?? []) as unknown as RegistroAtividade[]).map((a) => ({
      ...a,
      lote_key: loteKeyPorId[a.lote_id] ?? a.lote_id,
    }))

    if (buscarLancamentos) {
      versoes = montarVersoes(todasVersoes)
        .filter((v) => {
          if (lote && v.lote_key !== lote) return false
          if (de && v.data < de) return false
          if (ate && v.data > ate) return false
          return true
        })
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 100)
    }

    if (resAtividades.error) console.error('Erro ao buscar atividades:', resAtividades.error)
  }

  const totalRegistros = versoes.length + atividades.length
  const temFiltro = de || ate || lote || tipo

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          🐄 Manejo de Gado
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId
            ? 'Selecione uma fazenda para continuar.'
            : temFiltro
              ? `${totalRegistros} registros encontrados`
              : `Últimos ${totalRegistros} registros`}
        </p>
      </div>

      <ManejoClient
        lotes={lotes}
        produtosDisponiveis={produtos}
        versoesLote={versoes}
        atividadesRegistradas={atividades}
        filtros={{ de, ate, lote, tipo }}
      />
    </div>
  )
}
