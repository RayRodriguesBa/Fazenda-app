import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { nome, area_ha, aproveitamento_pasto, forrageira, ativo } = await request.json()

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
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

    const { error } = await supabase
      .from('piquete')
      .update({
        nome: nome.trim(),
        area_ha: area_ha ? Number(area_ha) : null,
        aproveitamento_pasto: aproveitamento_pasto ? Number(aproveitamento_pasto) : null,
        forrageira: forrageira || null,
        ativo: ativo ?? true,
      })
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message || 'Erro ao atualizar piquete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/piquetes/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

/**
 * Tabelas de fato que referenciam `piquete.id` por FK. Confirmado contra o schema
 * real do Supabase — se uma nova tabela ganhar `piquete_id`, ela precisa entrar
 * aqui, senão o DELETE passa na checagem e estoura violação de FK no banco.
 */
const TABELAS_DEPENDENTES = [
  { tabela: 'movimentacao_gado', rotulo: 'movimentação de gado' },
  { tabela: 'atividade', rotulo: 'atividade no campo' },
] as const

function pluralizar(qtd: number, rotulo: string) {
  return `${qtd} registro${qtd > 1 ? 's' : ''} de ${rotulo}`
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

    const { data: perfil } = await supabase
      .from('perfil')
      .select('perfil')
      .eq('id', user.id)
      .single()

    if (perfil?.perfil !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Confirma que o piquete existe E pertence à fazenda ativa antes de qualquer
    // coisa — senão um id de outra fazenda passaria pela checagem sem dependências
    // e cairia num delete que não afeta nada, devolvendo sucesso falso.
    const { data: piquete, error: errPiquete } = await admin
      .from('piquete')
      .select('id')
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)
      .maybeSingle()

    if (errPiquete) {
      console.error('Supabase error (busca piquete):', errPiquete)
      return NextResponse.json({ error: 'Erro ao excluir piquete' }, { status: 500 })
    }

    if (!piquete) {
      return NextResponse.json({ error: 'Piquete não encontrado nesta fazenda' }, { status: 404 })
    }

    // A contagem usa o admin client de propósito: com o client do usuário, a RLS
    // poderia esconder um fato existente e a exclusão passaria na checagem só
    // para falhar por violação de FK no banco.
    const contagens = await Promise.all(
      TABELAS_DEPENDENTES.map(async ({ tabela, rotulo }) => {
        const { count, error } = await admin
          .from(tabela)
          .select('id', { count: 'exact', head: true })
          .eq('piquete_id', id)

        return { rotulo, count: count ?? 0, error }
      })
    )

    const falha = contagens.find((c) => c.error)
    if (falha) {
      console.error('Supabase error (checagem de dependências do piquete):', falha.error)
      return NextResponse.json({ error: 'Erro ao verificar registros do piquete' }, { status: 500 })
    }

    const bloqueios = contagens.filter((c) => c.count > 0)
    if (bloqueios.length > 0) {
      const detalhe = bloqueios.map((b) => pluralizar(b.count, b.rotulo)).join(', ')
      return NextResponse.json(
        {
          error:
            `Não é possível excluir: este piquete possui ${detalhe}. ` +
            `Exclua esses registros primeiro ou marque o piquete como inativo.`,
        },
        { status: 409 }
      )
    }

    const { error: errDelete } = await admin
      .from('piquete')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazenda_id)

    if (errDelete) {
      // Rede de segurança: uma FK que não esteja em TABELAS_DEPENDENTES cai aqui.
      if (errDelete.code === '23503') {
        return NextResponse.json(
          { error: 'Não é possível excluir: este piquete possui registros vinculados.' },
          { status: 409 }
        )
      }
      console.error('Supabase error (delete piquete):', errDelete)
      return NextResponse.json({ error: 'Erro ao excluir piquete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/piquetes/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
