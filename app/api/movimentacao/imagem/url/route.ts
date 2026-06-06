import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { path } = await request.json()

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Caminho da imagem é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase.storage
      .from('piquete_imagens')
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: 'Erro ao gerar URL da imagem' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('POST /api/movimentacao/imagem/url error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
