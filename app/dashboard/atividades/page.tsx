import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import AtividadesClient, { type Atividade } from './AtividadesClient'

export default async function AtividadesPage() {
  const supabase = await createClient()

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let atividades: Atividade[] = []
  let produtos: { id: string; nome: string; categoria: string }[] = []
  let piquetes: { id: string; nome: string }[] = []

  if (fazendaId) {
    const [resAtiv, resProd, resPiq] = await Promise.all([
      supabase
        .from('atividade')
        .select(`
          id,
          data,
          tipo,
          modalidade,
          observacao,
          piquete_id,
          piquete(nome),
          atividade_produto(
            id,
            produto_id,
            produto(nome),
            volume,
            unidade,
            quantidade_unidade
          )
        `)
        .eq('fazenda_id', fazendaId)
        .order('data', { ascending: false })
        .limit(50),
      supabase
        .from('produto')
        .select('id, nome, ativo, categoria_produto(nome)')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      supabase
        .from('piquete')
        .select('id, nome')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId)
        .order('nome')
    ])

    atividades = (resAtiv.data ?? []).map((a: any) => ({
      id: a.id,
      data: a.data,
      tipo: a.tipo,
      modalidade: a.modalidade,
      observacao: a.observacao,
      piquete_id: a.piquete_id,
      piquete: a.piquete ?? null,
      produtos: (a.atividade_produto ?? []).map((ap: any) => ({
        id: ap.id,
        produto_id: ap.produto_id,
        produto: ap.produto ?? null,
        volume: ap.volume,
        unidade: ap.unidade,
        quantidade_unidade: ap.quantidade_unidade,
      })),
    }))

    produtos = (resProd.data || []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria_produto?.nome || '',
    }))
    piquetes = resPiq.data || []
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather">
          🚜 Atividades no Campo
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId ? 'Selecione uma fazenda para continuar.' : `Últimos ${atividades.length} registros`}
        </p>
      </div>

      <AtividadesClient 
        atividades={atividades} 
        produtosDisponiveis={produtos} 
        piquetesDisponiveis={piquetes} 
      />
    </div>
  )
}
