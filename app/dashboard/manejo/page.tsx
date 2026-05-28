import { redirect } from 'next/navigation'
import { Syringe } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { cookies } from 'next/headers'
import ManejoClient, { type Produto, type Lote } from './ManejoClient'

export default async function ManejoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let lotes: Lote[] = []
  let produtos: Produto[] = []

  if (fazendaId) {
    const admin = createAdminClient()
    const [resLotes, resProdutos] = await Promise.all([
      admin
        .from('lote')
        .select('id, nome')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId)
        .order('nome'),
      admin
        .from('produto')
        .select('id, nome, ativo, categoria_produto(tipo_atividade)')
        .eq('ativo', true)
        .eq('fazenda_id', fazendaId),
    ])

    lotes = resLotes.data || []
    if (resProdutos.data) {
      produtos = resProdutos.data.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria_produto?.tipo_atividade || (Array.isArray(p.categoria_produto) ? p.categoria_produto[0]?.tipo_atividade : 'Desconhecida')
      })).sort((a: any, b: any) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          🐄 Manejo de Gado
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId ? 'Selecione uma fazenda para continuar.' : 'Registre o manejo e as atividades realizadas no gado'}
        </p>
      </div>

      <ManejoClient lotes={lotes} produtosDisponiveis={produtos} />
    </div>
  )
}
