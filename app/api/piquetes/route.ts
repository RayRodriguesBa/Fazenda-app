import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { nome, area_ha, aproveitamento_pasto, forrageira } = await request.json()

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

    const { error } = await supabase.from('piquete').insert({
      nome: nome.trim(),
      area_ha: area_ha ? Number(area_ha) : null,
      aproveitamento_pasto: aproveitamento_pasto ? Number(aproveitamento_pasto) : null,
      forrageira: forrageira || null,
      fazenda_id,
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message || 'Erro ao salvar piquete' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/piquetes error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
