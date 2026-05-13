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

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: `Modalidade inválida para ${tipo}` },
        { status: 400 }
      )
    }

    // Validate products array
    if (!Array.isArray(produtos) || produtos.length === 0) {
      // Roçagem pode ter 0 produtos (produto opcional), outros tipos exigem ao menos 1 produto
      if (tipo === 'Herbicida') {
        return NextResponse.json(
          { error: 'Pelo menos um produto é obrigatório para Herbicida' },
          { status: 400 }
        )
      }
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
          if ((p.unidade === 'Sacos' || p.unidade === 'Baldes') && (p.quantidade_unidade == null)) {
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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Insert atividade
    const { data: atividade, error: errAtiv } = await supabase
      .from('atividade')
      .insert({ data, tipo, modalidade, piquete_id, observacao: observacao?.trim() || null, fazenda_id })
      .select('id')
      .single()

    if (errAtiv || !atividade) {
      console.error('Supabase error (atividade):', errAtiv)
      return NextResponse.json({ error: 'Erro ao salvar atividade' }, { status: 500 })
    }

    // Insert atividade_produto rows
    if (Array.isArray(produtos) && produtos.length > 0) {
      const rows = produtos.map((p) => ({
        atividade_id: atividade.id,
        produto_id: p.produto_id,
        volume: p.volume ?? null,
        unidade: p.unidade ?? null,
        quantidade_unidade: p.quantidade_unidade ?? null,
      }))

      const { error: errProd } = await supabase.from('atividade_produto').insert(rows)
      if (errProd) {
        console.error('Supabase error (atividade_produto):', errProd)
        // Rollback: delete the atividade we just created
        await supabase.from('atividade').delete().eq('id', atividade.id)
        return NextResponse.json({ error: 'Erro ao salvar produtos da atividade' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/atividades error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
