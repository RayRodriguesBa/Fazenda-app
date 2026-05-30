import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function getAuthAndFazenda() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado', status: 401 }

  const cookieStore = await cookies()
  const fazenda_id = cookieStore.get('fazenda_id')?.value
  if (!fazenda_id) return { error: 'Fazenda não selecionada', status: 400 }

  return { supabase, user, fazenda_id }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthAndFazenda()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabase, fazenda_id } = auth

    const { lote_id, data, num_animais, peso_medio_kg, observacao } = await request.json()

    if (!lote_id || !data) {
      return NextResponse.json({ error: 'Data e lote são obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase
      .from('manejo_lancamentos')
      .update({
        lote_id,
        data,
        num_animais: num_animais != null ? Number(num_animais) : null,
        peso_medio_kg: peso_medio_kg != null ? Number(peso_medio_kg) : null,
        observacao: observacao?.trim() || null
      })
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error (manejo_lancamentos update):', error)
      return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/manejo/lancamentos/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthAndFazenda()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabase, fazenda_id } = auth

    const { error } = await supabase
      .from('manejo_lancamentos')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error (manejo_lancamentos delete):', error)
      return NextResponse.json({ error: 'Erro ao excluir lançamento' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/manejo/lancamentos/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
