import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha } = await request.json()

    if (!nome?.trim() || !email?.trim() || !senha) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica se é gestor
    const { data: perfil } = await supabase
      .from('perfil')
      .select('perfil')
      .eq('id', user.id)
      .single()

    if (perfil?.perfil !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Chama a Edge Function criar-usuario
    const { data: resultado, error } = await supabase.functions.invoke('criar-usuario', {
      body: { nome: nome.trim(), email: email.trim(), senha },
    })

    if (error) {
      console.error('Edge Function error:', error)
      return NextResponse.json(
        { error: 'Erro ao criar usuário. Verifique se o email já está em uso.' },
        { status: 500 }
      )
    }

    const cookieStore = await cookies()
    const fazenda_id = cookieStore.get('fazenda_id')?.value

    if (fazenda_id) {
      const adminClient = createAdminClient()
      let novoUserId = resultado?.user?.id || resultado?.id || resultado?.data?.user?.id

      if (!novoUserId) {
        const { data: { users } } = await adminClient.auth.admin.listUsers()
        const userFound = users.find(u => u.email === email.trim())
        if (userFound) {
          novoUserId = userFound.id
        }
      }

      if (novoUserId) {
        const { error: linkError } = await adminClient
          .from('fazenda_usuario')
          .insert({
            fazenda_id,
            usuario_id: novoUserId
          })
          
        if (linkError) {
          console.error('Erro ao vincular fazenda ao usuário:', linkError)
        }
      } else {
        console.warn('Não foi possível obter o ID do novo usuário para vincular à fazenda.')
      }
    }

    return NextResponse.json({ success: true, data: resultado }, { status: 201 })
  } catch (err) {
    console.error('POST /api/usuarios error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
