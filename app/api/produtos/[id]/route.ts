import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { nome, categoria, ativo } = await request.json()

    if (!nome?.trim() || !categoria) {
      return NextResponse.json({ error: 'Nome e categoria são obrigatórios' }, { status: 400 })
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

    const { data: categoriaData, error: categoriaError } = await supabase
      .from('categoria_produto')
      .select('id')
      .eq('tipo_atividade', categoria)
      .single()

    if (categoriaError || !categoriaData) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    const { error } = await supabase
      .from('produto')
      .update({
        nome: nome.trim(),
        categoria_id: categoriaData.id,
        ativo: ativo ?? true,
      })
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/produtos/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,  
  { params }: { params: Promise<{ id: string }> }

){


  try{
  const{id}= await params
  const cookieStore= await cookies()
  const fazenda_id= cookieStore.get('fazenda_id')?.value
  
  if(!fazenda_id){
   return  NextResponse.json({error:'Fazenda não selecionada'}, {status:400})
  }

   const supabase= await createClient()


  const {data: {user}}= await supabase.auth.getUser()

  if(!user) return NextResponse.json({error:'Não autenticado'}, {status:401})

  const {error}= await supabase.from('produto').delete().eq('id', id).eq('fazenda_id', fazenda_id)

  if(error){
    console.error('Supabase error:', error)
    return NextResponse.json({error:'Erro ao excluir produto'}, {status:500})
  }

  return NextResponse.json({success:true})
  }
  catch(err){
    console.error('DELETE /api/produtos[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor'})
  }
}
  