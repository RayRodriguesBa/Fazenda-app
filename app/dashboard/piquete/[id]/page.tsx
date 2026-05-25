import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import PastejoDetalheClient from './PastejoDetalheClient'

export default async function PiqueteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    supabase
      .from('lote')
      .select('id, nome')
      .eq('fazenda_id', fazendaId),
  ])

  if (!resPiquete.data) redirect('/dashboard/lotes')

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard/lotes"
          className="text-sm text-gray-500 hover:text-[var(--primary)] font-poppins transition-colors"
        >
          ← Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather">
            🌾 {resPiquete.data.nome}
          </h1>
          <p className="text-sm text-gray-500 font-poppins mt-0.5">Histórico completo de pastejos</p>
        </div>
      </div>

      <PastejoDetalheClient
        piquete={resPiquete.data}
        movimentacoes={resMovs.data || []}
        lotes={resLotes.data || []}
      />
    </div>
  )
}
