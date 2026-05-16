import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import DashboardNav from '@/app/components/DashboardNav'
import { cookies } from 'next/headers'
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfil')
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

  const isGestor = perfil?.perfil === 'gestor'
  const nome = perfil?.nome ?? user.email ?? 'Usuário'

  // Buscar fazendas que o usuário tem acesso
  const { data: fazendas } = await supabase
    .from('fazenda')
    .select('id, nome')
    .order('nome')

  // Determinar fazenda ativa pelo cookie ou selecionar a primeira
  const cookieStore = await cookies()
  const savedFazendaId = cookieStore.get('fazenda_id')?.value

  let activeFazendaId = savedFazendaId
  if (!activeFazendaId && fazendas && fazendas.length > 0) {
    activeFazendaId = fazendas[0].id
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col lg:flex-row">
      <DashboardNav 
        isGestor={isGestor} 
        nome={nome} 
        fazendas={fazendas || []} 
        activeFazendaId={activeFazendaId || ''} 
      />
      <main className="flex-1 pt-28 pb-20 lg:pt-0 lg:pb-0 lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
