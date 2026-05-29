import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { nome, descricao, num_animais, peso_medio_kg } = await request.json()

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const fazenda_id = cookieStore.get('fazenda_id')?.value
    if (!fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não selecionada' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('perfil')
      .select('perfil')
      .eq('id', user.id)
      .single()

    if (perfil?.perfil !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { error } = await supabase.from('lote').insert({
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      num_animais: num_animais ? Number(num_animais) : null,
      peso_medio_kg: peso_medio_kg ? Number(peso_medio_kg) : null,
      fazenda_id,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um lote com este nome.' }, { status: 400 })
      }
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao salvar lote' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/lotes error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

