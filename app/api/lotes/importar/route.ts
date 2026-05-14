import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type LoteImportado = {
  nome: string
  sexo: string | null
  num_animais: number
}

export async function POST(request: NextRequest) {
  try {
    const { lotes } = (await request.json()) as { lotes: LoteImportado[] }

    if (!Array.isArray(lotes) || lotes.length === 0) {
      return NextResponse.json({ error: 'Nenhum lote para importar' }, { status: 400 })
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

    // Buscar lotes já existentes nesta fazenda para evitar duplicatas
    const { data: lotesExistentes } = await supabase
      .from('lote')
      .select('nome')
      .eq('fazenda_id', fazenda_id)

    const nomesExistentes = new Set(
      (lotesExistentes ?? []).map((l: { nome: string }) => l.nome.toLowerCase().trim())
    )

    const lotesParaInserir = lotes
      .filter((l) => !nomesExistentes.has(l.nome.toLowerCase().trim()))
      .map((l) => ({
        nome: l.nome.trim(),
        sexo: l.sexo?.trim() || null,
        num_animais: l.num_animais,
        fazenda_id,
      }))

    if (lotesParaInserir.length === 0) {
      return NextResponse.json({
        success: true,
        inseridos: 0,
        ignorados: lotes.length,
        message: 'Todos os lotes já existem nesta fazenda.',
      })
    }

    const { error } = await supabase.from('lote').insert(lotesParaInserir)

    if (error) {
      console.error('Supabase error (importar lotes):', error)
      return NextResponse.json({ error: 'Erro ao importar lotes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inseridos: lotesParaInserir.length,
      ignorados: lotes.length - lotesParaInserir.length,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/lotes/importar error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
