import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import UsuariosClient, { type Usuario } from './UsuariosClient'
import { cookies } from 'next/headers'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meuPerfil } = await supabase
    .from('perfil')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (meuPerfil?.perfil !== 'gestor') redirect('/dashboard')

  const cookieStore = await cookies()
  const fazenda_id = cookieStore.get('fazenda_id')?.value

  if (!fazenda_id) {
    // Se não tiver fazenda selecionada, não mostra ninguém (ou redireciona)
    return (
      <div className="p-4 text-gray-500 font-poppins">
        Selecione uma fazenda para gerenciar seus usuários.
      </div>
    )
  }

  const admin = createAdminClient()

  // Busca os vínculos da fazenda atual
  const { data: vinculos } = await admin
    .from('fazenda_usuario')
    .select('usuario_id')
    .eq('fazenda_id', fazenda_id)

  const usuariosIds = vinculos?.map((v) => v.usuario_id) || []

  // Se não houver usuários vinculados (o que seria estranho, pois o gestor deveria estar),
  // retornamos array vazio (ou buscamos apenas se tiver IDs)
  let perfis: any[] = []
  if (usuariosIds.length > 0) {
    const { data: p } = await admin
      .from('perfil')
      .select('id, nome, perfil')
      .in('id', usuariosIds)
      .order('nome')
    perfis = p || []
  }

  const { data: authUsers } = await admin.auth.admin.listUsers()

  // Combina perfil + email do auth
  const emailPorId: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) {
    emailPorId[u.id] = u.email ?? ''
  }

  const usuarios: Usuario[] = (perfis ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    perfil: p.perfil,
    email: emailPorId[p.id] ?? '',
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          <Users className="inline-block mr-2 w-7 h-7 mb-1" /> Usuários
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
        </p>
      </div>

      <UsuariosClient usuarios={usuarios} />
    </div>
  )
}
