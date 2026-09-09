import { createClient } from '@/app/lib/supabase/server'
import { registrarVersaoLote, resolverLoteVersaoId } from '@/app/lib/lote'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lote_id, data, num_animais, peso_medio_kg, atividades } = body

    if (!lote_id || !data) {
      return NextResponse.json(
        { error: 'Data e lote são obrigatórios' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const fazenda_id = cookieStore.get('fazenda_id')?.value
    if (!fazenda_id) {
      return NextResponse.json({ error: 'Fazenda não selecionada' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Validação de negócio (Atividades duplicadas)
    if (atividades && Array.isArray(atividades)) {
      const tipos = atividades.map((a: { tipo: string }) => a.tipo).filter(Boolean)
      const tiposUnicos = new Set(tipos)
      if (tipos.length !== tiposUnicos.size) {
        return NextResponse.json(
          { error: 'Não é permitido registrar a mesma atividade mais de uma vez no mesmo manejo' },
          { status: 400 }
        )
      }
    }

    const temPesagem = num_animais != null || peso_medio_kg != null
    const temAtividades = atividades && Array.isArray(atividades) && atividades.length > 0

    if (!temPesagem && !temAtividades) {
      return NextResponse.json(
        { error: 'Informe ao menos um lançamento de pesagem ou uma atividade' },
        { status: 400 }
      )
    }

    // 1. Pesagem/contagem = nova versão do lote (SCD2). Roda ANTES das atividades
    //    para que elas já apontem para a versão recém-aberta nesta data.
    if (temPesagem) {
      const resultado = await registrarVersaoLote(
        lote_id,
        data,
        num_animais != null ? Number(num_animais) : null,
        peso_medio_kg != null ? Number(peso_medio_kg) : null,
        fazenda_id
      )

      if (!resultado.ok) {
        return NextResponse.json({ error: resultado.error }, { status: resultado.status })
      }
    }

    // 2. Atividades de manejo — apontam para a versão do lote válida na data do fato.
    if (temAtividades) {
      const loteVersaoId = await resolverLoteVersaoId(lote_id, data, fazenda_id)
      if (!loteVersaoId) {
        return NextResponse.json(
          { error: 'Lote não encontrado nesta fazenda' },
          { status: 404 }
        )
      }

      for (const ativ of atividades) {
        if (!ativ.tipo) continue

        const { data: ativInsert, error: ativError } = await supabase
          .from('manejo_atividade')
          .insert({
            fazenda_id,
            lote_id: loteVersaoId,
            data,
            tipo: ativ.tipo
          })
          .select('id')
          .single()

        if (ativError || !ativInsert) {
          console.error('Supabase error (manejo_atividade):', ativError)
          continue
        }

        const manejoAtividadeId = ativInsert.id

        // 3. Insert em manejo_atividade_produto
        if (ativ.produtos_ids && Array.isArray(ativ.produtos_ids) && ativ.produtos_ids.length > 0) {
          const produtosUnicos = Array.from(new Set(ativ.produtos_ids as string[]))
          const produtosPayload = produtosUnicos.map((pid: string) => ({
            manejo_atividade_id: manejoAtividadeId,
            produto_id: pid
          }))

          const { error: prodError } = await supabase
            .from('manejo_atividade_produto')
            .insert(produtosPayload)

          if (prodError) {
            console.error('Supabase error (manejo_atividade_produto):', prodError)
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/manejo error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
