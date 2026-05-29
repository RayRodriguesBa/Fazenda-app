'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Fazenda = {
  id: string
  nome: string
  localizacao: string | null
  ativo: boolean
}

function FazendaForm({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial?: Fazenda
  onSalvar: (dados: Record<string, unknown>) => Promise<void>
  onCancelar: () => void
}) {
  const [campos, setCampos] = useState({
    nome: inicial?.nome ?? '',
    localizacao: inicial?.localizacao ?? '',
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
        localizacao: campos.localizacao,
        ativo: campos.ativo,
      })
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-4">
      <h3 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {inicial ? 'Editar Fazenda' : 'Nova Fazenda'}
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
            placeholder="Ex: Pecuária F3"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Localização
          </label>
          <input
            type="text"
            value={campos.localizacao}
            onChange={(e) => setCampos({ ...campos, localizacao: e.target.value })}
            placeholder="Ex: Minas Gerais"
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

export default function FazendasClient({
  fazendas,
}: {
  fazendas: Fazenda[]
}) {
  const router = useRouter()
  const [showNovaFazenda, setShowNovaFazenda] = useState(false)
  const [editandoFazenda, setEditandoFazenda] = useState<Fazenda | null>(null)
  const [sucesso, setSucesso] = useState('')

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  const handleCriarFazenda = async (dados: Record<string, unknown>) => {
    const res = await fetch('/api/fazendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    const json = await res.json()
    
    // Atualiza fazenda ativa para a nova fazenda se desejar ou apenas atualiza a lista.
    await fetch('/api/fazendas/ativa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fazenda_id: json.fazenda.id })
    })

    setShowNovaFazenda(false)
    mostrarSucesso('Fazenda criada com sucesso!')
    // Para recarregar a lista de fazendas no menu lateral e em todo o app
    window.location.reload()
  }

  const handleEditarFazenda = async (dados: Record<string, unknown>) => {
    if (!editandoFazenda) return
    const res = await fetch(`/api/fazendas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dados, id: editandoFazenda.id }),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setEditandoFazenda(null)
    mostrarSucesso('Fazenda atualizada com sucesso!')
    // Atualiza tudo para refletir o nome atualizado no menu lateral
    window.location.reload()
  }

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      <div>
        {!showNovaFazenda && !editandoFazenda && (
          <button
            onClick={() => setShowNovaFazenda(true)}
            className="mb-4 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] transition-colors"
          >
            + Nova Fazenda
          </button>
        )}

        {showNovaFazenda && (
          <FazendaForm
            onSalvar={handleCriarFazenda}
            onCancelar={() => setShowNovaFazenda(false)}
          />
        )}

        {fazendas.length === 0 && !showNovaFazenda ? (
          <div className="text-center py-16 text-gray-400 font-poppins">
            <p className="text-4xl mb-3">🌾</p>
            <p className="text-base">Nenhuma fazenda cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fazendas.map((fazenda) => (
              <div key={fazenda.id}>
                {editandoFazenda?.id === fazenda.id ? (
                  <FazendaForm
                    inicial={fazenda}
                    onSalvar={handleEditarFazenda}
                    onCancelar={() => setEditandoFazenda(null)}
                  />
                ) : (
                  <button
                    onClick={() => {
                      setShowNovaFazenda(false)
                      setEditandoFazenda(fazenda)
                    }}
                    className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[var(--text)] font-poppins text-sm">
                            {fazenda.nome}
                          </p>
                          {!fazenda.ativo && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-poppins">
                              Inativo
                            </span>
                          )}
                        </div>
                        {fazenda.localizacao && (
                          <p className="text-xs text-gray-500 font-poppins mt-0.5">📍 {fazenda.localizacao}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
