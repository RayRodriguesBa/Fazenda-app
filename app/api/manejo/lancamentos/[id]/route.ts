import { NextResponse } from 'next/server'

/**
 * ROTA DESATIVADA — pode ser apagada com segurança.
 *
 * A tabela `manejo_lancamentos` foi removida na migração para SCD Tipo 2
 * (`migrations/20260908_lote_scd2.sql`). Pesagens e contagens deixaram de ser
 * registros próprios e passaram a ser VERSÕES da tabela `lote`, criadas por
 * `nova_versao_lote` a partir de `POST /api/manejo`.
 *
 * Versões são um histórico imutável: editar ou excluir uma delas quebraria os
 * fatos que a referenciam (`cocho`, `movimentacao_gado`, `manejo_atividade`) e a
 * continuidade dos períodos `[valido_de, valido_ate)`. Por isso não há
 * substituto para PUT/DELETE aqui.
 *
 * O arquivo só continua no repositório porque a remoção não pôde ser feita
 * automaticamente; apague a pasta `app/api/manejo/lancamentos/`.
 */
const RESPOSTA = {
  error:
    'Lançamentos de pesagem não existem mais como registro próprio. ' +
    'Use POST /api/manejo para abrir uma nova versão do lote.',
}

export async function PUT() {
  return NextResponse.json(RESPOSTA, { status: 410 })
}

export async function DELETE() {
  return NextResponse.json(RESPOSTA, { status: 410 })
}
