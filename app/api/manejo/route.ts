import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lote_id, data, pesagem_kg, observacao, atividades } = body

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
      const tipos = atividades.map(a => a.tipo).filter(Boolean)
      const tiposUnicos = new Set(tipos)
      if (tipos.length !== tiposUnicos.size) {
        return NextResponse.json(
          { error: 'Não é permitido registrar a mesma atividade mais de uma vez no mesmo manejo' },
          { status: 400 }
        )
      }
    }

    // 1. Insert em manejo
    const { data: manejoInsert, error: manejoError } = await supabase
      .from('manejo')
      .insert({
        fazenda_id,
        lote_id,
        data,
        pesagem_kg: pesagem_kg || null,
        observacao: observacao || null
      })
      .select('id')
      .single()

    if (manejoError || !manejoInsert) {
      console.error('Supabase error (manejo):', manejoError)
      return NextResponse.json({ error: 'Erro ao salvar o manejo' }, { status: 500 })
    }

    const manejoId = manejoInsert.id

    // 2. Insert em manejo_atividade e produtos
    if (atividades && Array.isArray(atividades)) {
      for (const ativ of atividades) {
        if (!ativ.tipo) continue // Pula se não tiver tipo definido

        const { data: ativInsert, error: ativError } = await supabase
          .from('manejo_atividade')
          .insert({
            manejo_id: manejoId,
            tipo: ativ.tipo
          })
          .select('id')
          .single()

        if (ativError || !ativInsert) {
          console.error('Supabase error (manejo_atividade):', ativError)
          // Falhou em inserir a atividade, mas o manejo principal já foi criado. 
          // Idealmente seria uma transação, mas por limitação da API REST fazemos sequencial.
          continue
        }

        const manejoAtividadeId = ativInsert.id

        // 3. Insert em manejo_atividade_produto
        if (ativ.produtos_ids && Array.isArray(ativ.produtos_ids) && ativ.produtos_ids.length > 0) {
          // Filtra produtos duplicados
          const produtosUnicos = Array.from(new Set(ativ.produtos_ids))
          const produtosPayload = produtosUnicos.map(pid => ({
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
