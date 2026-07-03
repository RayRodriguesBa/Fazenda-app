'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type RegistroChuva = {
  id: string
  data: string
  volume_mm: number
  observacao: string | null
}

type Modo = { tipo: 'criar' } | { tipo: 'editar'; registro: RegistroChuva }

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function ChuvaForm({
  modo,
  onSalvar,
  onExcluir,
  onCancelar,
}: {
  modo: Modo
  onSalvar: (dados: { data: string; volume_mm: number; observacao: string | null }) => Promise<void>
  onExcluir?: () => Promise<void>
  onCancelar: () => void
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.registro : null
  const hoje = new Date().toISOString().split('T')[0]

  const [data, setData] = useState(inicial?.data ?? hoje)
  const [volume, setVolume] = useState(inicial?.volume_mm?.toString() ?? '')
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '')
  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const isValido = data !== '' && volume !== '' && Number(volume) >= 0

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try {
      await onSalvar({ data, volume_mm: Number(volume), observacao: observacao.trim() || null })
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
        {editando ? 'Editar Registro' : 'Novo Registro de Chuva'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            Volume (mm) <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="Ex: 12.5"
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
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional..."
            rows={2}
            disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 resize-none transition"
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

export default function ChuvaClient({
  registros,
  diasSemChuva,
  mediaMm,
  de,
  ate,
}: {
  registros: RegistroChuva[]
  diasSemChuva: number
  mediaMm: number
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

  const handleCriar = async (dados: { data: string; volume_mm: number; observacao: string | null }) => {
    const res = await fetch('/api/chuva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Registro salvo com sucesso!')
    router.refresh()
  }

  const handleEditar = async (id: string, dados: { data: string; volume_mm: number; observacao: string | null }) => {
    const res = await fetch(`/api/chuva/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Registro atualizado com sucesso!')
    router.refresh()
  }

  const handleExcluir = async (id: string) => {
    const res = await fetch(`/api/chuva/${id}`, { method: 'DELETE' })
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
    router.push(`/dashboard/chuva?${params.toString()}`)
  }

  const handleLimparFiltros = () => {
    setDataInicio('')
    setDataFim('')
    router.push('/dashboard/chuva')
  }

  const totalMm = registros.reduce((acc, r) => acc + r.volume_mm, 0)
  const diasComChuva = registros.filter((r) => r.volume_mm > 0).length

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
          + Registrar Chuva
        </button>
      )}

      {modo?.tipo === 'criar' && (
        <ChuvaForm modo={modo} onSalvar={handleCriar} onCancelar={() => setModo(null)} />
      )}

      {registros.length > 0 && modo === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Dias sem chuva</p>
            <p className="text-2xl font-bold text-[var(--error)] font-poppins mt-1">
              {diasSemChuva} <span className="text-sm font-normal text-gray-500">dias</span>
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Total acumulado</p>
            <p className="text-2xl font-bold text-[var(--primary)] font-poppins mt-1">
              {totalMm.toFixed(1)} <span className="text-sm font-normal">mm</span>
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Média por dia de chuva</p>
            <p className="text-2xl font-bold text-[var(--primary-light)] font-poppins mt-1">
              {mediaMm.toFixed(1)} <span className="text-sm font-normal">mm</span>
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Dias com chuva</p>
            <p className="text-2xl font-bold text-[var(--primary)] font-poppins mt-1">
              {diasComChuva} <span className="text-sm font-normal">dias</span>
            </p>
          </div>
        </div>
      )}

      {/* Filter UI */}
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

      {registros.length === 0 && modo === null ? (
        <div className="text-center py-16 text-gray-400 font-poppins">
          <p className="text-4xl mb-3">🌤️</p>
          <p className="text-base">Nenhum registro ainda.</p>
          <p className="text-sm mt-1">Clique em "Registrar Chuva" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map((r) => (
            <div key={r.id}>
              {modo?.tipo === 'editar' && modo.registro.id === r.id ? (
                <ChuvaForm
                  modo={modo}
                  onSalvar={(dados) => handleEditar(r.id, dados)}
                  onExcluir={() => handleExcluir(r.id)}
                  onCancelar={() => setModo(null)}
                />
              ) : (
                <button
                  onClick={() => setModo({ tipo: 'editar', registro: r })}
                  className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)] font-poppins">
                      {formatarData(r.data)}
                    </p>
                    {r.observacao && (
                      <p className="text-xs text-gray-500 font-poppins mt-0.5">{r.observacao}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-[var(--primary-light)] font-poppins">
                      {r.volume_mm.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 font-poppins ml-1">mm</span>
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
