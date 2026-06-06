import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo excede o limite de 50 MB' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const fileName = `piquete_${timestamp}.${ext}`
    // Path follows bucket RLS: private/{userId}/{fileName}
    const filePath = `private/${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('piquete_imagens')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 })
    }

    return NextResponse.json({ path: filePath }, { status: 201 })
  } catch (err) {
    console.error('POST /api/movimentacao/imagem error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { path } = await request.json()

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Caminho da imagem é obrigatório' }, { status: 400 })
    }

    // Security: ensure the path belongs to the authenticated user
    if (!path.startsWith(`private/${user.id}/`)) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta imagem' }, { status: 403 })
    }

    const { error: deleteError } = await supabase.storage
      .from('piquete_imagens')
      .remove([path])

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Erro ao excluir imagem' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/movimentacao/imagem error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
