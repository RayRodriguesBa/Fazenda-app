'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { type Piquete, FORRAGEIRA_LABEL } from '../../lotes/LotesClient'

type MovimentacaoDetalhe = {
  id: string
  data: string
  tipo_operacao: 'Entrada' | 'Saída'
  media_altura: number | null
  altura1: number | null
  altura2: number | null
  altura3: number | null
  altura4: number | null
  altura5: number | null
  lote_id: string
}

type Lote = { id: string; nome: string }

type PastejoDetalhe = {
  lote_id: string
  lote_nome: string
  data_entrada: string
  data_saida: string | null
  media_entrada: number | null
  media_saida: number | null
  alturas_entrada: (number | null)[]
  alturas_saida: (number | null)[]
  dias_ocupado: number | null
  dias_descanso_previo: number | null
}

function formatarData(dataISO: string) {
  if (!dataISO || dataISO === '?') return '?'
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function getPastejosDetalhe(movimentacoes: MovimentacaoDetalhe[], lotes: Lote[]): PastejoDetalhe[] {
  const pastejos: PastejoDetalhe[] = []
  const abertos: Record<string, PastejoDetalhe> = {}

  // Sort by date ascending before pairing entries with exits
  const movsSorted = [...movimentacoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  for (const mov of movsSorted) {
    const loteNome = lotes.find(l => l.id === mov.lote_id)?.nome || 'Lote Desconhecido'
    const alturas: (number | null)[] = [mov.altura1, mov.altura2, mov.altura3, mov.altura4, mov.altura5]

    if (mov.tipo_operacao === 'Entrada') {
      // If there's already an open pastejo for this lote, close it implicitly
      if (abertos[mov.lote_id]) {
        delete abertos[mov.lote_id]
      }
      const p: PastejoDetalhe = {
        lote_id: mov.lote_id,
        lote_nome: loteNome,
        data_entrada: mov.data,
        data_saida: null,
        media_entrada: mov.media_altura,
        media_saida: null,
        alturas_entrada: alturas,
        alturas_saida: [null, null, null, null, null],
        dias_ocupado: null,
        dias_descanso_previo: null,
      }
      abertos[mov.lote_id] = p
      pastejos.push(p)
    } else if (mov.tipo_operacao === 'Saída') {
      const p = abertos[mov.lote_id]
      if (p) {
        p.data_saida = mov.data
        p.media_saida = mov.media_altura
        p.alturas_saida = alturas
        const d1 = new Date(p.data_entrada)
        const d2 = new Date(mov.data)
        p.dias_ocupado = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000))
        delete abertos[mov.lote_id]
      } else {
        pastejos.push({
          lote_id: mov.lote_id,
          lote_nome: loteNome,
          data_entrada: '?',
          data_saida: mov.data,
          media_entrada: null,
          media_saida: mov.media_altura,
          alturas_entrada: [null, null, null, null, null],
          alturas_saida: alturas,
          dias_ocupado: null,
          dias_descanso_previo: null,
        })
      }
    }
  }

  // Sort pastejos chronologically first for rest-day calculation
  pastejos.sort((a, b) => {
    const dateA = a.data_entrada !== '?' ? new Date(a.data_entrada).getTime() : 0
    const dateB = b.data_entrada !== '?' ? new Date(b.data_entrada).getTime() : 0
    return dateA - dateB
  })

  for (let i = 1; i < pastejos.length; i++) {
    const prev = pastejos[i - 1]
    const curr = pastejos[i]
    if (prev.data_saida && curr.data_entrada !== '?') {
      const d1 = new Date(prev.data_saida)
      const d2 = new Date(curr.data_entrada)
      curr.dias_descanso_previo = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000))
    }
  }

  // Sort descending so the most recent pastejo is at index 0
  // Active pastejos (no saída) always come first
  pastejos.sort((a, b) => {
    const aAberto = !a.data_saida
    const bAberto = !b.data_saida
    if (aAberto && !bAberto) return -1
    if (!aAberto && bAberto) return 1
    const dateA = a.data_entrada !== '?' ? new Date(a.data_entrada).getTime() : 0
    const dateB = b.data_entrada !== '?' ? new Date(b.data_entrada).getTime() : 0
    return dateB - dateA
  })

  return pastejos
}

export default function PastejoDetalheClient({
  piquete,
  movimentacoes,
  lotes,
  de,
  ate,
}: {
  piquete: Piquete
  movimentacoes: MovimentacaoDetalhe[]
  lotes: Lote[]
  de?: string
  ate?: string
}) {
  const router = useRouter()
  const [dataInicio, setDataInicio] = useState(de || '')
  const [dataFim, setDataFim] = useState(ate || '')

  useEffect(() => {
    setDataInicio(de || '')
    setDataFim(ate || '')
  }, [de, ate])

  const pastejos = getPastejosDetalhe(movimentacoes, lotes)

  const pastejosFiltrados = pastejos.filter((p) => {
    if (de) {
      const atendeDe = (p.data_entrada !== '?' && p.data_entrada >= de) || (p.data_saida && p.data_saida >= de) || !p.data_saida
      if (!atendeDe) return false
    }
    if (ate) {
      const atendeAte = (p.data_entrada !== '?' && p.data_entrada <= ate) || (p.data_saida && p.data_saida <= ate)
      if (!atendeAte) return false
    }
    return true
  })

  const isOcupado = pastejosFiltrados.length > 0 && !pastejosFiltrados[0].data_saida
  const refDate = ate && new Date(ate + 'T23:59:59').getTime() < new Date().getTime() ? new Date(ate + 'T23:59:59').getTime() : new Date().getTime()
  const diasDescansoAtual = (!isOcupado && pastejosFiltrados.length > 0 && pastejosFiltrados[0].data_saida) ? Math.max(0, Math.floor((refDate - new Date(pastejosFiltrados[0].data_saida).getTime()) / 86400000)) : 0
  const diasOcupadoAtual = (isOcupado && pastejosFiltrados[0].data_entrada !== '?') ? Math.max(0, Math.floor((refDate - new Date(pastejosFiltrados[0].data_entrada).getTime()) / 86400000)) : (pastejosFiltrados[0]?.dias_ocupado || 0)

  const totalDescansoAcumulado = pastejosFiltrados.reduce((acc, p) => acc + (p.dias_descanso_previo || 0), 0) + (!isOcupado ? diasDescansoAtual : 0)
  const totalOcupacaoAcumulada = pastejosFiltrados.reduce((acc, p) => acc + (p.dias_ocupado || 0), 0) + (isOcupado ? diasOcupadoAtual : 0)

  const handleFiltrar = () => {
    const params = new URLSearchParams()
    if (dataInicio) params.set('de', dataInicio)
    if (dataFim) params.set('ate', dataFim)
    router.push(`/dashboard/piquete/${piquete.id}?${params.toString()}`)
  }

  const handleLimpar = () => {
    setDataInicio('')
    setDataFim('')
    router.push(`/dashboard/piquete/${piquete.id}`)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] lg:h-[calc(100vh-50px)]">
      {/* TOPO FIXO — nunca rola */}
      <div className="shrink-0">
        <div className="mb-4 flex items-center gap-4">
          <Link
            href="/dashboard/lotes"
            className="text-sm text-gray-500 hover:text-[var(--primary)] font-poppins transition-colors"
          >
            ← Voltar
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather">
              🌾 {piquete.nome}
            </h1>
            <p className="text-sm text-gray-500 font-poppins mt-0.5">Histórico completo de pastejos</p>
          </div>
        </div>

        {/* Info do piquete */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
          <div className="flex flex-wrap gap-4 text-sm font-poppins text-gray-600">
            <span>📐 <strong className="text-[var(--text)]">{piquete.area_ha ?? '--'} ha</strong></span>
            {piquete.forrageira && (
              <span>🌾 <strong className="text-[var(--text)]">{FORRAGEIRA_LABEL[piquete.forrageira]}</strong></span>
            )}
            {piquete.aproveitamento_pasto && (
              <span>🌿 <strong className="text-[var(--text)]">{piquete.aproveitamento_pasto}% aproveitamento</strong></span>
            )}
            {!piquete.ativo && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded self-center">Inativo</span>
            )}
          </div>
        </div>

        {/* Filtro de Data */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">A partir de</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-gray-200 rounded-lg font-poppins text-xs focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-gray-200 rounded-lg font-poppins text-xs focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleFiltrar}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-[var(--primary-light)] text-white rounded-lg font-poppins font-semibold text-xs hover:bg-[var(--primary)] transition-colors"
            >
              Filtrar
            </button>
            {(de || ate) && (
              <button
                onClick={handleLimpar}
                className="flex-1 sm:flex-none px-4 py-1.5 border-2 border-gray-200 text-gray-600 rounded-lg font-poppins font-semibold text-xs hover:border-gray-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {pastejos.length > 0 && (
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-poppins">
              {pastejosFiltrados.length} pastejo(s) registrado(s) {de || ate ? '(filtrado)' : ''}
            </p>
            <div className="flex gap-4 text-xs font-poppins">
              <div className="bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg text-center">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">Descanso Total</span>
                <span className="text-sm font-bold text-amber-600">{totalDescansoAcumulado} d</span>
              </div>
              <div className="bg-green-50 border border-green-100 px-3 py-1 rounded-lg text-center">
                <span className="text-[10px] text-green-700 font-bold uppercase block">Ocupação Total</span>
                <span className="text-sm font-bold text-green-600">{totalOcupacaoAcumulada} d</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LISTA DE PASTEJOS — rolável internamente */}
      {pastejosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-poppins">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-base">Nenhum pastejo registrado para este piquete {de || ate ? 'no período selecionado' : ''}.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-4">
          {pastejosFiltrados.map((p, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header do pastejo */}
              <div className={`px-4 py-3 border-b flex justify-between items-center ${!p.data_saida ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--primary)] font-poppins">{p.lote_nome}</span>
                  {!p.data_saida && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-600 text-white px-1.5 py-0.5 rounded">Em andamento</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-poppins">
                  {p.dias_descanso_previo != null && (
                    <span className="font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {p.dias_descanso_previo} d desc.
                    </span>
                  )}
                  <span className="font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {p.dias_ocupado !== null ? `${p.dias_ocupado} d ocup.` : 'Ocupando...'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                {/* Datas */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm font-poppins">
                  <div>
                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider block mb-1 font-poppins">Data Entrada</span>
                    <span className="font-semibold text-[var(--text)]">{formatarData(p.data_entrada)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block mb-1 font-poppins">Data Saída</span>
                    <span className="font-semibold text-[var(--text)]">{p.data_saida ? formatarData(p.data_saida) : '—'}</span>
                  </div>
                </div>

                {/* Alturas */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Entrada */}
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2 font-poppins">Medições na Entrada</span>
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3, 4].map(j => (
                        <div key={j} className="flex justify-between text-xs font-poppins text-gray-600 bg-gray-50 rounded px-2 py-1">
                          <span className="text-gray-400">M{j + 1}</span>
                          <span className="font-medium">{p.alturas_entrada[j] ? `${p.alturas_entrada[j]} cm` : '—'}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-poppins border-t-2 border-gray-200 pt-1.5 mt-1">
                        <span className="font-bold text-gray-700">Média</span>
                        <span className="font-bold text-gray-900">{p.media_entrada ? `${p.media_entrada} cm` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Saída */}
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2 font-poppins">Medições na Saída</span>
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3, 4].map(j => (
                        <div key={j} className="flex justify-between text-xs font-poppins text-gray-600 bg-gray-50 rounded px-2 py-1">
                          <span className="text-gray-400">M{j + 1}</span>
                          <span className="font-medium">{p.alturas_saida[j] ? `${p.alturas_saida[j]} cm` : '—'}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-poppins border-t-2 border-gray-200 pt-1.5 mt-1">
                        <span className="font-bold text-gray-700">Média</span>
                        <span className="font-bold text-gray-900">
                          {p.media_saida ? `${p.media_saida} cm` : (p.data_saida ? '—' : 'Em andamento')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
