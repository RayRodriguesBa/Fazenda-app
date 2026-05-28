import { redirect } from 'next/navigation'
import { Package } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import ProdutosClient, { type Produto } from './ProdutosClient'

export default async function ProdutosPage() {
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

  let produtos: Produto[] = []

  if (fazendaId) {
    const { data } = await supabase
      .from('produto')
      .select('id, nome, ativo, categoria_produto(tipo_atividade)')
      .eq('fazenda_id', fazendaId)

    if (data) {
      produtos = data.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        ativo: p.ativo,
        categoria: p.categoria_produto?.tipo_atividade || 'Desconhecida'
      })).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          <Package className="inline-block mr-2 w-7 h-7 mb-1" /> Produtos
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId ? 'Selecione uma fazenda para continuar.' : `${produtos.length} produtos cadastrados`}
        </p>
      </div>

      <ProdutosClient produtos={produtos} />
    </div>
  )
}
