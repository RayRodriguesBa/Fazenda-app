import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { cookies } from 'next/headers'
import ManejoClient, { type Produto, type Lote, type RegistroAtividade } from './ManejoClient'

type LinhaVersao = {
  id: string
  lote_key: string
  nome: string
  num_animais: number | null
  peso_medio_kg: number | null
  valido_ate: string | null
  ativo: boolean
}

export default async function ManejoPage(props: {
  searchParams: Promise<{ de?: string; ate?: string; lote?: string }>
}) {
  const searchParams = await props.searchParams
  const { de, ate, lote } = searchParams

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // O gestor registra pesagem pela aba Lotes/Piquetes. O operador não tem acesso
  // àquela aba, então o formulário de pesagem só aparece aqui para ele.
  const { data: perfil } = await supabase
    .from('perfil')
    .select('perfil')
    .eq('id', user.id)
    .single()

  const isGestor = perfil?.perfil === 'gestor'

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let lotes: Lote[] = []
  let produtos: Produto[] = []
  let atividades: RegistroAtividade[] = []

  if (fazendaId) {
    const admin = createAdminClient()

    // SCD2: todas as versões de lote da fazenda. Servem para duas coisas: o
    // seletor (só as vigentes) e o mapeamento do lote_id histórico das
    // atividades de volta para a chave de negócio.
    const { data: linhasVersao } = await admin
      .from('lote')
      .select('id, lote_key, nome, num_animais, peso_medio_kg, valido_ate, ativo')
      .eq('fazenda_id', fazendaId)

    const todasVersoes = (linhasVersao ?? []) as LinhaVersao[]

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
      queryAtividades.limit(100),
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

    if (resAtividades.error) console.error('Erro ao buscar atividades:', resAtividades.error)
  }

  const totalRegistros = atividades.length
  const temFiltro = de || ate || lote

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
              ? `${totalRegistros} atividades encontradas`
              : `Últimas ${totalRegistros} atividades`}
        </p>
      </div>

      <ManejoClient
        lotes={lotes}
        produtosDisponiveis={produtos}
        atividadesRegistradas={atividades}
        isGestor={isGestor}
        filtros={{ de, ate, lote }}
      />
    </div>
  )
}
