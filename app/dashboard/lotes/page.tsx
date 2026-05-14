import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import LotesClient, { type Lote, type Piquete } from './LotesClient'

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

  if (fazendaId) {
    const [resLotes, resPiquetes] = await Promise.all([
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
    ])
    lotes = resLotes.data || []
    piquetes = resPiquetes.data || []
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather">
          📋 Lotes e Piquetes
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId ? 'Selecione uma fazenda para continuar.' : `${lotes.length} lotes · ${piquetes.length} piquetes cadastrados`}
        </p>
      </div>

      <LotesClient lotes={lotes} piquetes={piquetes} />
    </div>
  )
}
