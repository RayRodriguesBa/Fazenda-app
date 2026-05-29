'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Lote = { id: string; nome: string }
export type Produto = { id: string; nome: string; categoria: string }

export type AtividadeFormItem = {
  key: number
  tipo: string
  produtos_ids: string[]
}

const TIPOS_ATIVIDADE = [
  'Banho',
  'Vermifugo',
  'Pour-On',
  'Vacina'
]

type FormPayload = {
  lote_id: string
  data: string
  pesagem_kg: number | null
  num_animais: number | null
  peso_medio_kg: number | null
  observacao: string | null
  atividades: {
    tipo: string
    produtos_ids: string[]
  }[]
}

let _keyCounter = 0
function nextKey() { return ++_keyCounter }

export default function ManejoClient({
  lotes,
  produtosDisponiveis
}: {
  lotes: Lote[]
  produtosDisponiveis: Produto[]
}) {
  const router = useRouter()
  
  const hoje = new Date().toISOString().split('T')[0]
  const [data, setData] = useState(hoje)
  const [loteId, setLoteId] = useState('')
  const [pesagem, setPesagem] = useState('')
  const [numAnimais, setNumAnimais] = useState('')
  const [pesoMedio, setPesoMedio] = useState('')
  const [observacao, setObservacao] = useState('')
  const [atividades, setAtividades] = useState<AtividadeFormItem[]>([])

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  const addAtividade = () => {
    setAtividades(prev => [...prev, { key: nextKey(), tipo: '', produtos_ids: [] }])
  }

  const removeAtividade = (key: number) => {
    setAtividades(prev => prev.filter(a => a.key !== key))
  }

  const updateAtividade = (key: number, updated: AtividadeFormItem) => {
    setAtividades(prev => prev.map(a => a.key === key ? updated : a))
  }

  const toggleProduto = (atividadeKey: number, produtoId: string) => {
    setAtividades(prev => prev.map(a => {
      if (a.key !== atividadeKey) return a
      const has = a.produtos_ids.includes(produtoId)
      return {
        ...a,
        produtos_ids: has ? a.produtos_ids.filter(id => id !== produtoId) : [...a.produtos_ids, produtoId]
      }
    }))
  }

  // Validações
  const tiposSelecionados = atividades.map(a => a.tipo).filter(Boolean)
  const temTipoDuplicado = new Set(tiposSelecionados).size !== tiposSelecionados.length

  const isAtividadesValidas = () => {
    if (temTipoDuplicado) return false
    for (const a of atividades) {
      if (!a.tipo) return false
    }
    return true
  }

  const isValido =
    data !== '' &&
    loteId !== '' &&
    (!pesagem || Number(pesagem) > 0) &&
    (!numAnimais || Number(numAnimais) >= 0) &&
    (!pesoMedio || Number(pesoMedio) > 0) &&
    isAtividadesValidas()

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try {
      const payload: FormPayload = {
        lote_id: loteId,
        data,
        pesagem_kg: pesagem ? Number(pesagem) : null,
        num_animais: numAnimais ? Number(numAnimais) : null,
        peso_medio_kg: pesoMedio ? Number(pesoMedio) : null,
        observacao: observacao.trim() || null,
        atividades: atividades.map(a => ({
          tipo: a.tipo,
          produtos_ids: a.produtos_ids
        }))
      }

      const res = await fetch('/api/manejo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      mostrarSucesso('Manejo registrado com sucesso!')
      
      // Resetar formulário
      setLoteId('')
      setData(hoje)
      setPesagem('')
      setNumAnimais('')
      setPesoMedio('')
      setObservacao('')
      setAtividades([])
      
      router.refresh()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar manejo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-4 max-w-3xl">
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
              Data <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              max={hoje}
              disabled={loading}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
            />
          </div>

          {/* Lote */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
              Lote <span className="text-[var(--error)]">*</span>
            </label>
            <select
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
            >
              <option value="">Selecione...</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pesagem */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
              Pesagem (kg) <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              value={pesagem}
              onChange={(e) => setPesagem(e.target.value)}
              placeholder="Ex: 250"
              min="0.1"
              step="0.01"
              disabled={loading}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
            />
          </div>

          {/* Nº de Animais */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
              Nº de Animais <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              value={numAnimais}
              onChange={(e) => setNumAnimais(e.target.value)}
              placeholder="Ex: 50"
              min="0"
              disabled={loading}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
            />
          </div>

          {/* Peso Médio */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
              Peso Médio (kg) <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              value={pesoMedio}
              onChange={(e) => setPesoMedio(e.target.value)}
              placeholder="Ex: 380"
              min="0.1"
              step="0.1"
              disabled={loading}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
            />
          </div>
        </div>

        {/* Atividades */}
        <div>
          <div className="flex items-center justify-between mb-2 mt-4">
            <label className="block text-sm font-medium text-[var(--text)] font-poppins">
              Atividades Realizadas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <button
              type="button"
              onClick={addAtividade}
              disabled={loading}
              className="text-xs font-semibold text-[var(--primary)] font-poppins hover:underline disabled:opacity-50"
            >
              + Adicionar atividade
            </button>
          </div>
          
          {temTipoDuplicado && (
            <p className="text-xs text-[var(--error)] font-poppins mb-2">
              Não é permitido adicionar o mesmo tipo de atividade mais de uma vez.
            </p>
          )}

          <div className="space-y-3">
            {atividades.map((a) => (
              <div key={a.key} className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 font-poppins uppercase tracking-wide">Nova Atividade</span>
                  <button type="button" onClick={() => removeAtividade(a.key)} disabled={loading} className="text-xs text-[var(--error)] font-poppins hover:underline disabled:opacity-50">
                    ✕ Remover
                  </button>
                </div>
                
                <select
                  value={a.tipo}
                  onChange={(e) => updateAtividade(a.key, { ...a, tipo: e.target.value, produtos_ids: [] })}
                  disabled={loading}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
                >
                  <option value="">Selecione o tipo de atividade...</option>
                  {TIPOS_ATIVIDADE.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {a.tipo && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 font-poppins mt-2">
                      Produtos Utilizados <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-md p-2 space-y-1">
                      {produtosDisponiveis.filter(p => p.categoria === a.tipo).length === 0 ? (
                        <p className="text-xs text-gray-400 font-poppins p-1">Nenhum produto cadastrado para esta categoria.</p>
                      ) : (
                        produtosDisponiveis.filter(p => p.categoria === a.tipo).map(p => (
                          <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={a.produtos_ids.includes(p.id)}
                              onChange={() => toggleProduto(a.key, p.id)}
                              disabled={loading}
                              className="rounded text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4"
                            />
                            <span className="text-sm text-gray-700 font-poppins">{p.nome}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Observação */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Observação <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Alguma anotação sobre o manejo..."
            disabled={loading}
            rows={3}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition resize-none"
          />
        </div>
      </div>

      {erro && (
        <div className="mt-4 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
          {erro}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleSalvar}
          disabled={!isValido || loading}
          className="w-full sm:w-auto px-8 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Salvando...' : 'Salvar Registro de Manejo'}
        </button>
      </div>
    </div>
  )
}
