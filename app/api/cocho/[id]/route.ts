import { createClient } from '@/app/lib/supabase/server'
import { resolverLoteVersaoId } from '@/app/lib/lote'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { lote_id, data, kg, observacao } = await request.json()

    if (!lote_id || !data || kg == null || kg === '') {
      return NextResponse.json({ error: 'Lote, data e kg são obrigatórios' }, { status: 400 })
    }

    const kgNum = Number(kg)
    if (isNaN(kgNum) || kgNum < 0) {
      return NextResponse.json({ error: 'Quantidade deve ser um número positivo' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const fazenda_id = cookieStore.get('fazenda_id')?.value
    if (!fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não selecionada' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // SCD2: o fato aponta para a versão do lote válida na data do fato.
    const loteVersaoId = await resolverLoteVersaoId(lote_id, data, fazenda_id)
    if (!loteVersaoId) {
      return NextResponse.json({ error: 'Lote não encontrado nesta fazenda' }, { status: 404 })
    }

    const { error } = await supabase
      .from('cocho')
      .update({ lote_id: loteVersaoId, data, kg: kgNum, observacao: observacao?.trim() || null })
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar registro' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/cocho/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const fazenda_id = cookieStore.get('fazenda_id')?.value
    if (!fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não selecionada' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { error } = await supabase.from('cocho').delete().eq('id', id).eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao excluir registro' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/cocho/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
