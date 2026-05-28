import { redirect } from 'next/navigation'
import { Map } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/server'
import FazendasClient from './FazendasClient'

export default async function FazendasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfil')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (perfil?.perfil !== 'gestor') redirect('/dashboard')

  // Buscar todas as fazendas vinculadas ao gestor
  const { data: fazendas } = await supabase
    .from('fazenda')
    .select('id, nome, localizacao, ativo')
    .order('nome')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          <Map className="inline-block mr-2 w-7 h-7 mb-1" /> Gestão de Fazendas
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {fazendas?.length || 0} fazendas cadastradas
        </p>
      </div>

      <FazendasClient fazendas={fazendas || []} />
    </div>
  )
}
