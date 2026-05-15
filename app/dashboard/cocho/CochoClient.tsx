'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type RegistroCocho = {
  id: string
  data: string
  kg: number
  observacao: string | null
  lote_id: string
  lote: { nome: string }
}

type Lote = { id: string; nome: string }
type Modo = { tipo: 'criar' } | { tipo: 'editar'; registro: RegistroCocho }

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function CochoForm({
  modo,
  lotes,
  onSalvar,
  onExcluir,
  onCancelar,
}: {
  modo: Modo
  lotes: Lote[]
  onSalvar: (dados: { lote_id: string; data: string; kg: number; observacao: string | null }) => Promise<void>
  onExcluir?: () => Promise<void>
  onCancelar: () => void
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.registro : null
  const hoje = new Date().toISOString().split('T')[0]

  const [loteId, setLoteId] = useState(inicial?.lote_id ?? '')
  const [data, setData] = useState(inicial?.data ?? hoje)
  const [kg, setKg] = useState(inicial?.kg?.toString() ?? '')
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '')
  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const isValido = loteId !== '' && data !== '' && kg !== '' && Number(kg) >= 0

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try {
      await onSalvar({ lote_id: loteId, data, kg: Number(kg), observacao: observacao.trim() || null })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleExcluir = async () => {
    if (!onExcluir) return
    setExcluindo(true)
    setErro('')
    try {
      await onExcluir()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir')
      setConfirmarExclusao(false)
    } finally { 
      setExcluindo(false)
    }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-4">
      <h2 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {editando ? 'Editar Abastecimento' : 'Novo Abastecimento do Cocho'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Lote <span className="text-[var(--error)]">*</span>
          </label>
          <select
            value={loteId}
            onChange={(e) => setLoteId(e.target.value)}
            disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
          >
            <option value="">Selecione um lote...</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Data <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={hoje}
            disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Quantidade (kg) <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="number"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="Ex: 150"
            min="0"
            step="0.1"
            disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Observação
          </label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
            disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>
      </div>

      {erro && (
        <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
          {erro}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={handleSalvar}
            disabled={!isValido || loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar'}
          </button>
          <button
            onClick={onCancelar}
            disabled={loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>

        {editando && onExcluir && (
          <div className="border-t border-gray-100 pt-3">
            {!confirmarExclusao ? (
              <button
                onClick={() => setConfirmarExclusao(true)}
                disabled={loading || excluindo}
                className="text-sm text-[var(--error)] font-poppins hover:underline disabled:opacity-50"
              >
                Excluir registro
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-[var(--error)] font-poppins font-medium">
                  Confirmar exclusão?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExcluir}
                    disabled={excluindo}
                    className="px-4 py-1.5 bg-[var(--error)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                  <button
                    onClick={() => setConfirmarExclusao(false)}
                    disabled={excluindo}
                    className="px-4 py-1.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CochoClient({
  registros,
  lotes,
  de,
  ate,
}: {
  registros: RegistroCocho[]
  lotes: Lote[]
  de?: string
  ate?: string
}) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [sucesso, setSucesso] = useState('')
  const [dataInicio, setDataInicio] = useState(de || '')
  const [dataFim, setDataFim] = useState(ate || '')

  useEffect(() => {
    setDataInicio(de || '')
    setDataFim(ate || '')
  }, [de, ate])

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  const handleCriar = async (dados: { lote_id: string; data: string; kg: number; observacao: string | null }) => {
    const res = await fetch('/api/cocho', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Abastecimento registrado com sucesso!')
    router.refresh()
  }

  const handleEditar = async (id: string, dados: { lote_id: string; data: string; kg: number; observacao: string | null }) => {
    const res = await fetch(`/api/cocho/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Abastecimento atualizado com sucesso!')
    router.refresh()
  }

  const handleExcluir = async (id: string) => {
    const res = await fetch(`/api/cocho/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Registro excluído com sucesso!')
    router.refresh()
  }

  const handleFiltrar = () => {
    const params = new URLSearchParams()
    if (dataInicio) params.set('de', dataInicio)
    if (dataFim) params.set('ate', dataFim)
    router.push(`/dashboard/cocho?${params.toString()}`)
  }

  const handleLimparFiltros = () => {
    setDataInicio('')
    setDataFim('')
    router.push('/dashboard/cocho')
  }

  const totalKg = registros.reduce((acc, r) => acc + r.kg, 0)

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      {modo === null && (
        <button
          onClick={() => setModo({ tipo: 'criar' })}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold hover:bg-[#1a3009] transition-colors mb-6"
        >
          + Registrar Abastecimento
        </button>
      )}

      {modo?.tipo === 'criar' && (
        <CochoForm modo={modo} lotes={lotes} onSalvar={handleCriar} onCancelar={() => setModo(null)} />
      )}

      {/* Filtro de período */}
      {modo === null && (registros.length > 0 || de || ate) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">A partir de</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">Até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleFiltrar}
              className="flex-1 sm:flex-none px-4 py-2 bg-[var(--primary-light)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[var(--primary)] transition-colors"
            >
              Filtrar
            </button>
            {(de || ate) && (
              <button onClick={handleLimparFiltros}
                className="flex-1 sm:flex-none px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {registros.length > 0 && modo === null && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Total fornecido</p>
            <p className="text-2xl font-bold text-[var(--primary)] font-poppins mt-1">
              {totalKg.toFixed(0)} <span className="text-sm font-normal">kg</span>
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Registros</p>
            <p className="text-2xl font-bold text-[var(--primary)] font-poppins mt-1">
              {registros.length}
            </p>
          </div>
        </div>
      )}

      {registros.length === 0 && modo === null ? (
        <div className="text-center py-16 text-gray-400 font-poppins">
          <p className="text-4xl mb-3">🌾</p>
          <p className="text-base">Nenhum abastecimento registrado.</p>
          <p className="text-sm mt-1">Clique em "Registrar Abastecimento" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map((r) => (
            <div key={r.id}>
              {modo?.tipo === 'editar' && modo.registro.id === r.id ? (
                <CochoForm
                  modo={modo}
                  lotes={lotes}
                  onSalvar={(dados) => handleEditar(r.id, dados)}
                  onExcluir={() => handleExcluir(r.id)}
                  onCancelar={() => setModo(null)}
                />
              ) : (
                <button
                  onClick={() => setModo({ tipo: 'editar', registro: r })}
                  className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] font-poppins">
                      {r.lote.nome}
                    </p>
                    <p className="text-xs text-gray-500 font-poppins mt-0.5">
                      📅 {formatarData(r.data)}
                      {r.observacao && ` · ${r.observacao}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-[var(--accent)] font-poppins">
                      {r.kg.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-500 font-poppins ml-1">kg</span>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
