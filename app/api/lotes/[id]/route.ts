import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { hojeISO, registrarVersaoLote, resolverLoteKey } from '@/app/lib/lote'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/** Converte para número, tratando '' e null como ausência de valor. */
function num(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isNaN(n) ? null : n
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { nome, descricao, num_animais, peso_medio_kg, ativo, data } = await request.json()

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

    const loteKey = await resolverLoteKey(id, fazenda_id)
    if (!loteKey) {
      return NextResponse.json({ error: 'Lote não encontrado nesta fazenda' }, { status: 404 })
    }

    const admin = createAdminClient()

    const { data: vigente } = await admin
      .from('lote')
      .select('id, num_animais, peso_medio_kg')
      .eq('lote_key', loteKey)
      .is('valido_ate', null)
      .maybeSingle()

    if (!vigente) {
      return NextResponse.json(
        { error: 'Este lote não possui versão vigente. Verifique a migração de dados.' },
        { status: 409 }
      )
    }

    // Campos estáticos: valem para o lote inteiro, então são propagados a TODAS as
    // versões — assim os fatos históricos continuam exibindo o nome correto.
    const { error: errEstaticos } = await supabase
      .from('lote')
      .update({
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        ativo: ativo ?? true,
      })
      .eq('lote_key', loteKey)
      .eq('fazenda_id', fazenda_id)

    if (errEstaticos) {
      if (errEstaticos.code === '23505') {
        return NextResponse.json({ error: 'Já existe um lote com este nome.' }, { status: 400 })
      }
      console.error('Supabase error (lote estáticos):', errEstaticos)
      return NextResponse.json({ error: 'Erro ao atualizar lote' }, { status: 500 })
    }

    // Campos versionados: nunca sofrem UPDATE direto — mudança abre nova versão.
    const novoNum = num(num_animais)
    const novoPeso = num(peso_medio_kg)
    const mudouContagem = novoNum !== (vigente.num_animais ?? null)
    const mudouPeso = novoPeso !== (vigente.peso_medio_kg ?? null)

    if (mudouContagem || mudouPeso) {
      const resultado = await registrarVersaoLote(
        loteKey,
        data || hojeISO(),
        novoNum,
        novoPeso,
        fazenda_id
      )

      if (!resultado.ok) {
        return NextResponse.json({ error: resultado.error }, { status: resultado.status })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/lotes/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}

/**
 * Tabelas de fato que referenciam `lote.id` por FK. Confirmado contra o schema
 * real do Supabase — se uma nova tabela ganhar `lote_id`, ela precisa entrar aqui,
 * senão o DELETE abaixo passa na checagem e estoura violação de FK no banco.
 *
 * `manejo` não é usada pelo app (resíduo de schema antigo), mas a FK existe e
 * bloquearia a exclusão do mesmo jeito — por isso também é verificada.
 */
const TABELAS_DEPENDENTES = [
  { tabela: 'movimentacao_gado', rotulo: 'movimentação de gado' },
  { tabela: 'cocho', rotulo: 'cocho' },
  { tabela: 'manejo_atividade', rotulo: 'atividade de manejo' },
  { tabela: 'manejo', rotulo: 'manejo' },
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

    const loteKey = await resolverLoteKey(id, fazenda_id)
    if (!loteKey) {
      return NextResponse.json({ error: 'Lote não encontrado nesta fazenda' }, { status: 404 })
    }

    const admin = createAdminClient()

    // SCD2: excluir o lote significa excluir TODAS as suas versões — e os fatos
    // apontam para ids de versão, não para o lote_key. Por isso a checagem
    // precisa cobrir o conjunto inteiro de ids.
    const { data: versoes, error: errVersoes } = await admin
      .from('lote')
      .select('id')
      .eq('lote_key', loteKey)
      .eq('fazenda_id', fazenda_id)

    if (errVersoes) {
      console.error('Supabase error (lote versões):', errVersoes)
      return NextResponse.json({ error: 'Erro ao excluir lote' }, { status: 500 })
    }

    const versaoIds = (versoes ?? []).map((v) => v.id)
    if (versaoIds.length === 0) {
      return NextResponse.json({ error: 'Lote não encontrado nesta fazenda' }, { status: 404 })
    }

    // A contagem usa o admin client de propósito: com o client do usuário, a RLS
    // poderia esconder um fato existente e a exclusão passaria na checagem só
    // para falhar por violação de FK no banco.
    const contagens = await Promise.all(
      TABELAS_DEPENDENTES.map(async ({ tabela, rotulo }) => {
        const { count, error } = await admin
          .from(tabela)
          .select('id', { count: 'exact', head: true })
          .in('lote_id', versaoIds)

        return { rotulo, count: count ?? 0, error }
      })
    )

    const falha = contagens.find((c) => c.error)
    if (falha) {
      console.error('Supabase error (checagem de dependências do lote):', falha.error)
      return NextResponse.json({ error: 'Erro ao verificar registros do lote' }, { status: 500 })
    }

    const bloqueios = contagens.filter((c) => c.count > 0)
    if (bloqueios.length > 0) {
      const detalhe = bloqueios.map((b) => pluralizar(b.count, b.rotulo)).join(', ')
      return NextResponse.json(
        {
          error:
            `Não é possível excluir: este lote possui ${detalhe}. ` +
            `Exclua esses registros primeiro ou marque o lote como inativo.`,
        },
        { status: 409 }
      )
    }

    const { error: errDelete } = await admin
      .from('lote')
      .delete()
      .eq('lote_key', loteKey)
      .eq('fazenda_id', fazenda_id)

    if (errDelete) {
      // Rede de segurança: uma FK que não esteja em TABELAS_DEPENDENTES cai aqui.
      if (errDelete.code === '23503') {
        return NextResponse.json(
          { error: 'Não é possível excluir: este lote possui registros vinculados.' },
          { status: 409 }
        )
      }
      console.error('Supabase error (delete lote):', errDelete)
      return NextResponse.json({ error: 'Erro ao excluir lote' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/lotes/[id] error:', err)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
