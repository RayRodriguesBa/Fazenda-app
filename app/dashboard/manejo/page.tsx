import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { cookies } from 'next/headers'
import ManejoClient, { type Produto, type Lote, type RegistroLancamento, type RegistroAtividade } from './ManejoClient'

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
  let lancamentos: RegistroLancamento[] = []
  let atividades: RegistroAtividade[] = []

  // Determinar o que buscar com base no filtro de tipo
  const buscarLancamentos = !tipo || tipo === 'lancamentos' || tipo === 'todos'
  const buscarAtividades = !tipo || tipo === 'atividades' || tipo === 'todos'

  if (fazendaId) {
    const admin = createAdminClient()

    // Queries base
    let queryLancamentos = supabase
      .from('manejo_lancamentos')
      .select('id, data, num_animais, peso_medio_kg, tipo_pesagem, observacao, lote_id, lote(nome)')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })

    let queryAtividades = supabase
      .from('manejo_atividade')
      .select('id, data, tipo, lote_id, lote(nome)')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })

    // Aplicar filtros de data
    if (de) {
      queryLancamentos = queryLancamentos.gte('data', de)
      queryAtividades = queryAtividades.gte('data', de)
    }
    if (ate) {
      queryLancamentos = queryLancamentos.lte('data', ate)
      queryAtividades = queryAtividades.lte('data', ate)
    }

    // Aplicar filtro de lote
    if (lote) {
      queryLancamentos = queryLancamentos.eq('lote_id', lote)
      queryAtividades = queryAtividades.eq('lote_id', lote)
    }

    const [resLotes, resProdutos, resLancamentos, resAtividades] = await Promise.all([
      admin
        .from('lote')
        .select('id, nome, num_animais, peso_medio_kg')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      admin
        .from('produto')
        .select('id, nome, ativo, categoria_produto(tipo_atividade)')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId),
      buscarLancamentos ? queryLancamentos.limit(100) : Promise.resolve({ data: [], error: null }),
      buscarAtividades ? queryAtividades.limit(100) : Promise.resolve({ data: [], error: null }),
    ])

    lotes = resLotes.data || []
    if (resProdutos.data) {
      produtos = resProdutos.data.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria_produto?.tipo_atividade || (Array.isArray(p.categoria_produto) ? p.categoria_produto[0]?.tipo_atividade : 'Desconhecida')
      })).sort((a: any, b: any) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
    }
    lancamentos = (resLancamentos.data ?? []) as unknown as RegistroLancamento[]
    atividades = (resAtividades.data ?? []) as unknown as RegistroAtividade[]

    if (resLancamentos.error) console.error('Erro ao buscar lançamentos:', resLancamentos.error)
    if (resAtividades.error) console.error('Erro ao buscar atividades:', resAtividades.error)
  }

  const totalRegistros = lancamentos.length + atividades.length
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
        lancamentos={lancamentos}
        atividadesRegistradas={atividades}
        filtros={{ de, ate, lote, tipo }}
      />
    </div>
  )
}
