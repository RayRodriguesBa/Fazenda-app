import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      data,
      lote_id,
      piquete_id,
      tipo_operacao,
      qualidade,
      observacao,
      altura1,
      altura2,
      altura3,
      altura4,
      altura5,
      foto_url,
    } = body

    // Validações obrigatórias
    if (!data || !lote_id || !piquete_id || !tipo_operacao) {
      return NextResponse.json(
        { error: 'Data, lote, piquete e tipo são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['Entrada', 'Saída'].includes(tipo_operacao)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }


    // Alturas opcional, mas se preencher 1, tem que preencher as 5 (tudo ou nada)
    const alturas = [altura1, altura2, altura3, altura4, altura5]
    const alturasPreenchidas = alturas.filter((a) => a != null && a !== '')
    if (alturasPreenchidas.length > 0 && alturasPreenchidas.length < 5) {
      return NextResponse.json(
        { error: 'Para registrar a medição, preencha as 5 alturas ou nenhuma' },
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

    const registro: Record<string, unknown> = {
      data,
      lote_id,
      piquete_id,
      tipo_operacao,
      qualidade: qualidade || null,
      observacao: observacao?.trim() || null,
      altura1: altura1 ? Number(altura1) : null,
      altura2: altura2 ? Number(altura2) : null,
      altura3: altura3 ? Number(altura3) : null,
      altura4: altura4 ? Number(altura4) : null,
      altura5: altura5 ? Number(altura5) : null,
      foto_url: foto_url || null,
      fazenda_id,
    }

    const { error } = await supabase.from('movimentacao_gado').insert(registro)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao salvar movimentação' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/movimentacao error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
