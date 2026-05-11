'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Lote = {
  id: string
  nome: string
  descricao: string | null
  num_animais: number | null
  peso_medio_kg: number | null
  ativo: boolean
}

export type Forrageira = 'Sempre_verde' | 'Marandu' | 'Bengo' | 'Grama' | 'Decumbens'

export const FORRAGEIRA_LABEL: Record<Forrageira, string> = {
  Sempre_verde: 'Sempre_verde',
  Marandu: 'Marandu',
  Bengo: 'Bengo',
  Grama: 'Grama',
  Decumbens: 'Decumbens',
}

export type Piquete = {
  id: string
  nome: string
  area_ha: number | null
  aproveitamento_pasto: number | null
  forrageira: Forrageira | null
  ativo: boolean
}

type Tab = 'lotes' | 'piquetes'

const CAMPO_VAZIO_LOTE = { nome: '', descricao: '', num_animais: '', peso_medio_kg: '' }
const CAMPO_VAZIO_PIQUETE = { nome: '', area_ha: '' }

function LoteForm({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial?: Lote
  onSalvar: (dados: Record<string, unknown>) => Promise<void>
  onCancelar: () => void
}) {
  const [campos, setCampos] = useState({
    nome: inicial?.nome ?? '',
    descricao: inicial?.descricao ?? '',
    num_animais: inicial?.num_animais?.toString() ?? '',
    peso_medio_kg: inicial?.peso_medio_kg?.toString() ?? '',
    ativo: inicial?.ativo ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const isValido = campos.nome.trim() !== ''

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try {
      await onSalvar({
        nome: campos.nome,
        descricao: campos.descricao,
        num_animais: campos.num_animais || null,
        peso_medio_kg: campos.peso_medio_kg || null,
        ativo: campos.ativo,
      })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-4">
      <h3 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {inicial ? 'Editar Lote' : 'Novo Lote'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Nome <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="text"
            value={campos.nome}
            onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
            placeholder="Ex: Lote A"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Nº de Animais
          </label>
          <input
            type="number"
            value={campos.num_animais}
            onChange={(e) => setCampos({ ...campos, num_animais: e.target.value })}
            placeholder="Ex: 50"
            min="0"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Peso Médio (kg)
          </label>
          <input
            type="number"
            value={campos.peso_medio_kg}
            onChange={(e) => setCampos({ ...campos, peso_medio_kg: e.target.value })}
            placeholder="Ex: 380"
            min="0"
            step="0.1"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Descrição
          </label>
          <input
            type="text"
            value={campos.descricao}
            onChange={(e) => setCampos({ ...campos, descricao: e.target.value })}
            placeholder="Opcional"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        {inicial && (
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCampos({ ...campos, ativo: !campos.ativo })}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                campos.ativo ? 'bg-[var(--primary)]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  campos.ativo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-poppins text-[var(--text)]">
              {campos.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        )}
      </div>

      {erro && (
        <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
          {erro}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleSalvar}
          disabled={!isValido || loading}
          className="flex-1 sm:flex-none px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancelar}
          disabled={loading}
          className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function PiqueteForm({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial?: Piquete
  onSalvar: (dados: Record<string, unknown>) => Promise<void>
  onCancelar: () => void
}) {
  const [campos, setCampos] = useState({
    nome: inicial?.nome ?? '',
    area_ha: inicial?.area_ha?.toString() ?? '',
    aproveitamento_pasto: inicial?.aproveitamento_pasto?.toString() ?? '',
    forrageira: inicial?.forrageira ?? '' as Forrageira | '',
    ativo: inicial?.ativo ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const isValido = campos.nome.trim() !== ''

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try {
      await onSalvar({
        nome: campos.nome,
        area_ha: campos.area_ha || null,
        aproveitamento_pasto: campos.aproveitamento_pasto || null,
        forrageira: campos.forrageira || null,
        ativo: campos.ativo,
      })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-4">
      <h3 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {inicial ? 'Editar Piquete' : 'Novo Piquete'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Nome <span className="text-[var(--error)]">*</span>
          </label>
          <input
            type="text"
            value={campos.nome}
            onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
            placeholder="Ex: Piquete 1"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Área (ha)
          </label>
          <input
            type="number"
            value={campos.area_ha}
            onChange={(e) => setCampos({ ...campos, area_ha: e.target.value })}
            placeholder="Ex: 5.2"
            min="0"
            step="0.01"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Aproveitamento (%)
          </label>
          <input
            type="number"
            value={campos.aproveitamento_pasto}
            onChange={(e) => setCampos({ ...campos, aproveitamento_pasto: e.target.value })}
            placeholder="0 a 100"
            min="0"
            max="100"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Forrageira
          </label>
          <select
            value={campos.forrageira}
            onChange={(e) => setCampos({ ...campos, forrageira: e.target.value as Forrageira | '' })}
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
          >
            <option value="">Não informada</option>
            {(Object.entries(FORRAGEIRA_LABEL) as [Forrageira, string][]).map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>
        </div>

        {inicial && (
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCampos({ ...campos, ativo: !campos.ativo })}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                campos.ativo ? 'bg-[var(--primary)]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  campos.ativo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-poppins text-[var(--text)]">
              {campos.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        )}
      </div>

      {erro && (
        <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
          {erro}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleSalvar}
          disabled={!isValido || loading}
          className="flex-1 sm:flex-none px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancelar}
          disabled={loading}
          className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function LotesClient({
  lotes,
  piquetes,
}: {
  lotes: Lote[]
  piquetes: Piquete[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('lotes')
  const [showNovoLote, setShowNovoLote] = useState(false)
  const [showNovoPiquete, setShowNovoPiquete] = useState(false)
  const [editandoLote, setEditandoLote] = useState<Lote | null>(null)
  const [editandoPiquete, setEditandoPiquete] = useState<Piquete | null>(null)
  const [sucesso, setSucesso] = useState('')

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  const handleCriarLote = async (dados: Record<string, unknown>) => {
    const res = await fetch('/api/lotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setShowNovoLote(false)
    mostrarSucesso('Lote criado com sucesso!')
    router.refresh()
  }

  const handleEditarLote = async (dados: Record<string, unknown>) => {
    if (!editandoLote) return
    const res = await fetch(`/api/lotes/${editandoLote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setEditandoLote(null)
    mostrarSucesso('Lote atualizado com sucesso!')
    router.refresh()
  }

  const handleCriarPiquete = async (dados: Record<string, unknown>) => {
    const res = await fetch('/api/piquetes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setShowNovoPiquete(false)
    mostrarSucesso('Piquete criado com sucesso!')
    router.refresh()
  }

  const handleEditarPiquete = async (dados: Record<string, unknown>) => {
    if (!editandoPiquete) return
    const res = await fetch(`/api/piquetes/${editandoPiquete.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setEditandoPiquete(null)
    mostrarSucesso('Piquete atualizado com sucesso!')
    router.refresh()
  }

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(['lotes', 'piquetes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setShowNovoLote(false)
              setShowNovoPiquete(false)
              setEditandoLote(null)
              setEditandoPiquete(null)
            }}
            className={`flex-1 py-2 rounded-lg font-poppins font-semibold text-sm capitalize transition-colors ${
              tab === t
                ? 'bg-white text-[var(--primary)] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'lotes' ? '📋 Lotes' : '🗺️ Piquetes'}
          </button>
        ))}
      </div>

      {/* Aba Lotes */}
      {tab === 'lotes' && (
        <div>
          {!showNovoLote && !editandoLote && (
            <button
              onClick={() => setShowNovoLote(true)}
              className="mb-4 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] transition-colors"
            >
              + Novo Lote
            </button>
          )}

          {showNovoLote && (
            <LoteForm
              onSalvar={handleCriarLote}
              onCancelar={() => setShowNovoLote(false)}
            />
          )}

          {lotes.length === 0 && !showNovoLote ? (
            <div className="text-center py-16 text-gray-400 font-poppins">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-base">Nenhum lote cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lotes.map((lote) => (
                <div key={lote.id}>
                  {editandoLote?.id === lote.id ? (
                    <LoteForm
                      inicial={lote}
                      onSalvar={handleEditarLote}
                      onCancelar={() => setEditandoLote(null)}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setShowNovoLote(false)
                        setEditandoLote(lote)
                      }}
                      className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[var(--text)] font-poppins text-sm">
                              {lote.nome}
                            </p>
                            {!lote.ativo && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-poppins">
                                Inativo
                              </span>
                            )}
                          </div>
                          {lote.descricao && (
                            <p className="text-xs text-gray-500 font-poppins mt-0.5">{lote.descricao}</p>
                          )}
                          <div className="flex gap-4 mt-1.5 flex-wrap">
                            {lote.num_animais != null && (
                              <span className="text-xs text-gray-600 font-poppins">
                                🐄 {lote.num_animais} animais
                              </span>
                            )}
                            {lote.peso_medio_kg != null && (
                              <span className="text-xs text-gray-600 font-poppins">
                                ⚖️ {lote.peso_medio_kg} kg médio
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aba Piquetes */}
      {tab === 'piquetes' && (
        <div>
          {!showNovoPiquete && !editandoPiquete && (
            <button
              onClick={() => setShowNovoPiquete(true)}
              className="mb-4 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] transition-colors"
            >
              + Novo Piquete
            </button>
          )}

          {showNovoPiquete && (
            <PiqueteForm
              onSalvar={handleCriarPiquete}
              onCancelar={() => setShowNovoPiquete(false)}
            />
          )}

          {piquetes.length === 0 && !showNovoPiquete ? (
            <div className="text-center py-16 text-gray-400 font-poppins">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-base">Nenhum piquete cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {piquetes.map((piquete) => (
                <div key={piquete.id}>
                  {editandoPiquete?.id === piquete.id ? (
                    <PiqueteForm
                      inicial={piquete}
                      onSalvar={handleEditarPiquete}
                      onCancelar={() => setEditandoPiquete(null)}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setShowNovoPiquete(false)
                        setEditandoPiquete(piquete)
                      }}
                      className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[var(--text)] font-poppins text-sm">
                              {piquete.nome}
                            </p>
                            {!piquete.ativo && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-poppins">
                                Inativo
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 mt-0.5 flex-wrap">
                            {piquete.area_ha != null && (
                              <span className="text-xs text-gray-600 font-poppins block">
                                📐 {piquete.area_ha} ha
                              </span>
                            )}
                            {piquete.aproveitamento_pasto != null && (
                              <span className="text-xs text-gray-600 font-poppins block">
                                🌿 {piquete.aproveitamento_pasto}% aprov.
                              </span>
                            )}
                            {piquete.area_ha != null && piquete.aproveitamento_pasto != null && (
                              <span className="text-xs text-gray-600 font-poppins block">
                                🎯 {((piquete.area_ha * piquete.aproveitamento_pasto) / 100).toFixed(1)} ha útil
                              </span>
                            )}
                            {piquete.forrageira && (
                              <span className="text-xs text-gray-600 font-poppins block">
                                🌾 {FORRAGEIRA_LABEL[piquete.forrageira]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
