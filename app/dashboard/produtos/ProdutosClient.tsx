'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Produto = {
  id: string
  nome: string
  categoria: 'Adubação' | 'Herbicida' | 'Roçagem' | 'Banho' | 'Pour-On' | 'Vermifugo' | 'Vacina'
  ativo: boolean
}

type Modo = { tipo: 'criar' } | { tipo: 'editar'; registro: Produto }

const CATEGORIAS = [
  'Adubação',
  'Herbicida',
  'Roçagem',
  'Banho',
  'Pour-On',
  'Vermifugo',
  'Vacina'
] as const
type Categoria = typeof CATEGORIAS[number]

const CATEGORIA_ICONS: Record<Categoria, string> = {
  Adubação: '🌱',
  Herbicida: '🧴',
  Roçagem: '🌿',
  Banho: '🛁',
  'Pour-On': '💧',
  Vermifugo: '💊',
  Vacina: '💉',
}

const CATEGORIA_CORES: Record<Categoria, string> = {
  Adubação: 'bg-green-100 text-green-700',
  Herbicida: 'bg-blue-100 text-blue-700',
  Roçagem: 'bg-yellow-100 text-yellow-700',
  Banho: 'bg-indigo-100 text-indigo-700',
  'Pour-On': 'bg-cyan-100 text-cyan-700',
  Vermifugo: 'bg-purple-100 text-purple-700',
  Vacina: 'bg-red-100 text-red-700',
}

function ProdutoForm({
  modo,
  onSalvar,
  onCancelar,
  onExcluir,
}: {
  modo: Modo
  onSalvar: (dados: Record<string, unknown>) => Promise<void>
  onCancelar: () => void
  onExcluir?: () => Promise<void>
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.registro : null
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  const [campos, setCampos] = useState({
    nome: inicial?.nome ?? '',
    categoria: inicial?.categoria ?? 'Adubação',
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
        categoria: campos.categoria,
        ativo: campos.ativo,
      })
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar. Tente novamente.')
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
    }
    catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir")
      setConfirmarExclusao(false)
    }
    finally {
      setExcluindo(false)
    }

  }


  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-4">
      <h3 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {editando ? 'Editar Produto' : 'Novo Produto'}
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
            placeholder="Ex: Ureia"
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Categoria <span className="text-[var(--error)]">*</span>
          </label>
          <select
            value={campos.categoria}
            onChange={(e) => setCampos({ ...campos, categoria: e.target.value as Categoria })}
            disabled={loading}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_ICONS[c]} {c}
              </option>
            ))}
          </select>
        </div>

        {editando && onExcluir && (
          !confirmarExclusao ? (
            <div className="flex items-center gap-4">

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCampos({ ...campos, ativo: !campos.ativo })}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${campos.ativo ? 'bg-[var(--primary)]' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${campos.ativo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <span className="text-sm font-poppins text-[var(--text)]">
                  {campos.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <button
                onClick={() => setConfirmarExclusao(true)}
                disabled={loading || excluindo}
                className="text-sm text-[var(--error)] font-poppins hover:underline disabled:opacity-50"
              >
                Excluir registro
              </button>
            </div>
          ) :
            (
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
            )

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

export default function ProdutosClient({ produtos }: { produtos: Produto[] }) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [sucesso, setSucesso] = useState('')

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  const handleExcluir = async (id: string) => {
    const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Registro excluído com sucesso!')
    router.refresh()
  }


  const handleCriar = async (dados: Record<string, unknown>) => {
    const res = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setModo(null)
    mostrarSucesso('Produto criado com sucesso!')
    router.refresh()
  }

  const handleEditar = async (dados: Record<string, unknown>) => {
    if (modo?.tipo !== 'editar') return
    const res = await fetch(`/api/produtos/${modo.registro.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    setModo(null)
    mostrarSucesso('Produto atualizado com sucesso!')
    router.refresh()
  }

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
          className="mb-6 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] transition-colors"
        >
          + Novo Produto
        </button>
      )}

      {modo?.tipo === 'criar' && (
        <ProdutoForm
          modo={modo}
          onSalvar={handleCriar}
          onCancelar={() => setModo(null)}

        />
      )}

      {produtos.length === 0 && modo === null ? (
        <div className="text-center py-16 text-gray-400 font-poppins">
          <p className="text-4xl mb-3">🧪</p>
          <p className="text-base">Nenhum produto cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {produtos.map((produto) => (
            <div key={produto.id}>
              {modo?.tipo === 'editar' && modo.registro.id === produto.id ? (
                <ProdutoForm
                  modo={modo}
                  onSalvar={handleEditar}
                  onCancelar={() => setModo(null)}
                  onExcluir={() => handleExcluir(produto.id)}
                />
              ) : (
                <button
                  onClick={() => setModo({ tipo: 'editar', registro: produto })}
                  className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[var(--text)] font-poppins text-sm">
                          {produto.nome}
                        </p>
                        {!produto.ativo && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-poppins">
                            Inativo
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full font-poppins mt-0.5 ${CATEGORIA_CORES[produto.categoria as Categoria] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORIA_ICONS[produto.categoria as Categoria] ?? '📂'} {produto.categoria}
                      </span>
                    </div>
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
