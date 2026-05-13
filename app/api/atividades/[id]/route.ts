import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const MODALIDADES: Record<string, string[]> = {
  Adubação: ['Manual', 'Trator'],
  Herbicida: ['Manual', 'Trator'],
  Roçagem: ['Manual', 'Trator'],
}

const UNIDADES: Record<string, string[]> = {
  Adubação: ['Sacos', 'Kg'],
  Herbicida: ['Baldes', 'Jatão'],
}

type ProdutoPayload = {
  produto_id: string
  volume: number | null
  unidade: string | null
  quantidade_unidade: number | null
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, tipo, modalidade, piquete_id, observacao, produtos } =
      await request.json() as {
        data: string
        tipo: string
        modalidade: string
        piquete_id: string
        observacao?: string
        produtos: ProdutoPayload[]
      }

    if (!data || !tipo || !modalidade || !piquete_id) {
      return NextResponse.json(
        { error: 'Data, tipo, modalidade e piquete são obrigatórios' },
        { status: 400 }
      )
    }

    if (!Object.keys(MODALIDADES).includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    if (!MODALIDADES[tipo].includes(modalidade)) {
      return NextResponse.json({ error: `Modalidade inválida para ${tipo}` }, { status: 400 })
    }

    if (tipo === 'Herbicida' && (!Array.isArray(produtos) || produtos.length === 0)) {
      return NextResponse.json({ error: 'Pelo menos um produto é obrigatório para Herbicida' }, { status: 400 })
    }

    const temUnidade = UNIDADES[tipo] !== undefined
    if (Array.isArray(produtos) && produtos.length > 0) {
      for (const p of produtos) {
        if (!p.produto_id) {
          return NextResponse.json({ error: 'produto_id é obrigatório em cada produto' }, { status: 400 })
        }
        if (temUnidade) {
          if (!p.unidade || !UNIDADES[tipo].includes(p.unidade)) {
            return NextResponse.json({ error: `Unidade inválida para ${tipo}` }, { status: 400 })
          }
          if (p.volume == null) {
            return NextResponse.json({ error: 'Volume é obrigatório para este tipo' }, { status: 400 })
          }
          if ((p.unidade === 'Sacos' || p.unidade === 'Baldes') && p.quantidade_unidade == null) {
            return NextResponse.json({ error: 'A quantidade de sacos/baldes é obrigatória' }, { status: 400 })
          }
        }
      }
    }

    const cookieStore = await cookies()
    const fazenda_id = cookieStore.get('fazenda_id')?.value
    if (!fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não selecionada' }, { status: 400 })
    }

    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const supabase = await createClient()

    // Update atividade (no more produto fields at top level)
    const { error: errAtiv } = await supabase
      .from('atividade')
      .update({ data, tipo, modalidade, piquete_id, observacao: observacao?.trim() || null })
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (errAtiv) {
      console.error('Supabase error (atividade update):', errAtiv)
      return NextResponse.json({ error: 'Erro ao atualizar atividade' }, { status: 500 })
    }

    // Replace atividade_produto rows: delete existing, then re-insert
    const { error: errDel } = await supabase
      .from('atividade_produto')
      .delete()
      .eq('atividade_id', id)

    if (errDel) {
      console.error('Supabase error (atividade_produto delete):', errDel)
      return NextResponse.json({ error: 'Erro ao atualizar produtos da atividade' }, { status: 500 })
    }

    if (Array.isArray(produtos) && produtos.length > 0) {
      const rows = produtos.map((p) => ({
        atividade_id: id,
        produto_id: p.produto_id,
        volume: p.volume ?? null,
        unidade: p.unidade ?? null,
        quantidade_unidade: p.quantidade_unidade ?? null,
      }))

      const { error: errIns } = await supabase.from('atividade_produto').insert(rows)
      if (errIns) {
        console.error('Supabase error (atividade_produto insert):', errIns)
        return NextResponse.json({ error: 'Erro ao salvar produtos da atividade' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/atividades/[id] error:', err)
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

    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const supabase = await createClient()
    // atividade_produto rows should cascade-delete if FK has ON DELETE CASCADE,
    // otherwise delete them explicitly first.
    await supabase.from('atividade_produto').delete().eq('atividade_id', id)
    const { error } = await supabase.from('atividade').delete().eq('id', id).eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao excluir atividade' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/atividades/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
