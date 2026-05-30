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

    const { lote_id, data, tipo, produtos_ids } = await request.json()

    if (!lote_id || !data || !tipo) {
      return NextResponse.json({ error: 'Data, lote e tipo são obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase
      .from('manejo_atividade')
      .update({ lote_id, data, tipo })
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error (manejo_atividade update):', error)
      return NextResponse.json({ error: 'Erro ao atualizar atividade' }, { status: 500 })
    }

    // Replace produtos: delete existing, re-insert
    await supabase
      .from('manejo_atividade_produto')
      .delete()
      .eq('manejo_atividade_id', id)

    if (produtos_ids && Array.isArray(produtos_ids) && produtos_ids.length > 0) {
      const produtosUnicos = Array.from(new Set(produtos_ids as string[]))
      const rows = produtosUnicos.map((pid: string) => ({
        manejo_atividade_id: id,
        produto_id: pid
      }))

      const { error: prodError } = await supabase
        .from('manejo_atividade_produto')
        .insert(rows)

      if (prodError) {
        console.error('Supabase error (manejo_atividade_produto insert):', prodError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/manejo/atividades/[id] error:', err)
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

    // Delete produtos first (may not cascade)
    await supabase
      .from('manejo_atividade_produto')
      .delete()
      .eq('manejo_atividade_id', id)

    const { error } = await supabase
      .from('manejo_atividade')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error (manejo_atividade delete):', error)
      return NextResponse.json({ error: 'Erro ao excluir atividade' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/manejo/atividades/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
