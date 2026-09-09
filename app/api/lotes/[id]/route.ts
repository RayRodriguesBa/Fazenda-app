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
