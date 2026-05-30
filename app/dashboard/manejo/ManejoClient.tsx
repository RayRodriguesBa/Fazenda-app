'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type Lote = { id: string; nome: string }
export type Produto = { id: string; nome: string; categoria: string }

export type RegistroLancamento = {
  id: string
  data: string
  num_animais: number | null
  peso_medio_kg: number | null
  tipo_pesagem: string | null
  observacao: string | null
  lote_id: string
  lote: { nome: string }
}

export type RegistroAtividade = {
  id: string
  data: string
  tipo: string
  lote_id: string
  lote: { nome: string }
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
  num_animais: number | null
  peso_medio_kg: number | null
  tipo_pesagem: string
  observacao: string | null
  atividades: {
    tipo: string
    produtos_ids: string[]
  }[]
}

type Filtros = {
  de?: string
  ate?: string
  lote?: string
  tipo?: string
}

type ModoFormLancamento = { tipo: 'criar' } | { tipo: 'editar'; registro: RegistroLancamento }
type ModoFormAtividade = { tipo: 'criar' } | { tipo: 'editar'; registro: RegistroAtividade }

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

const EMOJI_ATIVIDADE: Record<string, string> = {
  'Banho': '🚿',
  'Vermifugo': '💊',
  'Pour-On': '💧',
  'Vacina': '💉',
}

// ─── Formulário de Lançamento (Pesagem) ───────────────────────
function LancamentoForm({
  modo,
  lotes,
  onSalvar,
  onExcluir,
  onCancelar,
}: {
  modo: ModoFormLancamento
  lotes: Lote[]
  onSalvar: (dados: { lote_id: string; data: string; num_animais: number | null; peso_medio_kg: number | null; observacao: string | null }) => Promise<void>
  onExcluir?: () => Promise<void>
  onCancelar: () => void
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.registro : null
  const hoje = new Date().toISOString().split('T')[0]

  const [loteId, setLoteId] = useState(inicial?.lote_id ?? '')
  const [data, setData] = useState(inicial?.data ?? hoje)
  const [numAnimais, setNumAnimais] = useState(inicial?.num_animais?.toString() ?? '')
  const [pesoMedio, setPesoMedio] = useState(inicial?.peso_medio_kg?.toString() ?? '')
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '')

  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const isValido = data !== '' && loteId !== '' && (!numAnimais || Number(numAnimais) >= 0) && (!pesoMedio || Number(pesoMedio) > 0)

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try {
      await onSalvar({
        lote_id: loteId,
        data,
        num_animais: numAnimais ? Number(numAnimais) : null,
        peso_medio_kg: pesoMedio ? Number(pesoMedio) : null,
        observacao: observacao.trim() || null
      })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setLoading(false) }
  }

  const handleExcluir = async () => {
    if (!onExcluir) return
    setExcluindo(true)
    setErro('')
    try { await onExcluir() }
    catch (e: unknown) { setErro(e instanceof Error ? e.message : 'Erro ao excluir'); setConfirmarExclusao(false) }
    finally { setExcluindo(false) }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-6 max-w-3xl">
      <h2 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {editando ? 'Editar Atualização de Lote' : 'Nova Atualização de Lote'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Data <span className="text-[var(--error)]">*</span></label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} max={hoje} disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Lote <span className="text-[var(--error)]">*</span></label>
          <select value={loteId} onChange={(e) => setLoteId(e.target.value)} disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white">
            <option value="">Selecione...</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Nº de Animais</label>
          <input type="number" value={numAnimais} onChange={(e) => setNumAnimais(e.target.value)} placeholder="Ex: 50" min="0" disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Peso Médio (kg)</label>
          <input type="number" value={pesoMedio} onChange={(e) => setPesoMedio(e.target.value)} placeholder="Ex: 380" min="0.1" step="0.1" disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Observação</label>
          <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition" />
        </div>
      </div>

      {erro && <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">{erro}</div>}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <button onClick={handleSalvar} disabled={!isValido || loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar Registro'}
          </button>
          <button onClick={onCancelar} disabled={loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
        </div>
        {editando && onExcluir && (
          <div className="border-t border-gray-100 pt-3">
            {!confirmarExclusao ? (
              <button onClick={() => setConfirmarExclusao(true)} disabled={loading || excluindo}
                className="text-sm text-[var(--error)] font-poppins hover:underline disabled:opacity-50">
                Excluir registro
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-[var(--error)] font-poppins font-medium">Confirmar exclusão?</p>
                <div className="flex gap-2">
                  <button onClick={handleExcluir} disabled={excluindo}
                    className="px-4 py-1.5 bg-[var(--error)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                  <button onClick={() => setConfirmarExclusao(false)} disabled={excluindo}
                    className="px-4 py-1.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm disabled:opacity-50 transition-colors">
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

// ─── Formulário de Atividade ────────────────────────
function AtividadeForm({
  modo,
  lotes,
  produtosDisponiveis,
  onSalvar,
  onExcluir,
  onCancelar,
}: {
  modo: ModoFormAtividade
  lotes: Lote[]
  produtosDisponiveis: Produto[]
  onSalvar: (dados: { lote_id: string; data: string; tipo: string; produtos_ids: string[] }) => Promise<void>
  onExcluir?: () => Promise<void>
  onCancelar: () => void
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.registro : null
  const hoje = new Date().toISOString().split('T')[0]

  const [loteId, setLoteId] = useState(inicial?.lote_id ?? '')
  const [data, setData] = useState(inicial?.data ?? hoje)
  const [tipo, setTipo] = useState(inicial?.tipo ?? '')
  const [produtosIds, setProdutosIds] = useState<string[]>([])
  
  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const isValido = data !== '' && loteId !== '' && tipo !== ''

  const toggleProduto = (pid: string) => {
    setProdutosIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid])
  }

  const handleSalvar = async () => {
    if (!isValido) return
    setLoading(true)
    setErro('')
    try { await onSalvar({ lote_id: loteId, data, tipo, produtos_ids: produtosIds }) }
    catch (e: unknown) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') }
    finally { setLoading(false) }
  }

  const handleExcluir = async () => {
    if (!onExcluir) return
    setExcluindo(true)
    setErro('')
    try { await onExcluir() }
    catch (e: unknown) { setErro(e instanceof Error ? e.message : 'Erro ao excluir'); setConfirmarExclusao(false) }
    finally { setExcluindo(false) }
  }

  return (
    <div className="bg-white border-2 border-[var(--primary)] rounded-xl p-5 shadow-sm mb-6 max-w-3xl">
      <h2 className="text-base font-semibold text-[var(--primary)] font-poppins mb-4">
        {editando ? 'Editar Atividade de Manejo' : 'Nova Atividade de Manejo'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Data <span className="text-[var(--error)]">*</span></label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} max={hoje} disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Lote <span className="text-[var(--error)]">*</span></label>
          <select value={loteId} onChange={(e) => setLoteId(e.target.value)} disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white">
            <option value="">Selecione...</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">Tipo <span className="text-[var(--error)]">*</span></label>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setProdutosIds([]) }} disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white">
            <option value="">Selecione...</option>
            {TIPOS_ATIVIDADE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {tipo && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2 font-poppins">
            Produtos Utilizados <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="max-h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md p-2 space-y-1">
            {produtosDisponiveis.filter(p => p.categoria === tipo).length === 0 ? (
              <p className="text-xs text-gray-400 font-poppins p-1">Nenhum produto cadastrado para esta categoria.</p>
            ) : (
              produtosDisponiveis.filter(p => p.categoria === tipo).map(p => (
                <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                  <input type="checkbox" checked={produtosIds.includes(p.id)} onChange={() => toggleProduto(p.id)} disabled={loading || excluindo}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4" />
                  <span className="text-sm text-gray-700 font-poppins">{p.nome}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {erro && <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">{erro}</div>}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <button onClick={handleSalvar} disabled={!isValido || loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar Atividade'}
          </button>
          <button onClick={onCancelar} disabled={loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
        </div>
        {editando && onExcluir && (
          <div className="border-t border-gray-100 pt-3">
            {!confirmarExclusao ? (
              <button onClick={() => setConfirmarExclusao(true)} disabled={loading || excluindo}
                className="text-sm text-[var(--error)] font-poppins hover:underline disabled:opacity-50">
                Excluir registro
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-[var(--error)] font-poppins font-medium">Confirmar exclusão?</p>
                <div className="flex gap-2">
                  <button onClick={handleExcluir} disabled={excluindo}
                    className="px-4 py-1.5 bg-[var(--error)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                  <button onClick={() => setConfirmarExclusao(false)} disabled={excluindo}
                    className="px-4 py-1.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm disabled:opacity-50 transition-colors">
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

// ─── Componente Principal ─────────────────────────────────────
export default function ManejoClient({
  lotes,
  produtosDisponiveis,
  lancamentos,
  atividadesRegistradas,
  filtros
}: {
  lotes: Lote[]
  produtosDisponiveis: Produto[]
  lancamentos: RegistroLancamento[]
  atividadesRegistradas: RegistroAtividade[]
  filtros: Filtros
}) {
  const router = useRouter()
  const [modoCriar, setModoCriar] = useState<'lancamento' | 'atividade' | null>(null)
  const [modoEditar, setModoEditar] = useState<ModoFormLancamento | ModoFormAtividade | null>(null)

  // Filtros locais
  const [dataInicio, setDataInicio] = useState(filtros.de || '')
  const [dataFim, setDataFim] = useState(filtros.ate || '')
  const [filtroLote, setFiltroLote] = useState(filtros.lote || '')
  const [filtroTipo, setFiltroTipo] = useState(filtros.tipo || 'todos')

  useEffect(() => {
    setDataInicio(filtros.de || '')
    setDataFim(filtros.ate || '')
    setFiltroLote(filtros.lote || '')
    setFiltroTipo(filtros.tipo || 'todos')
  }, [filtros.de, filtros.ate, filtros.lote, filtros.tipo])

  const [sucesso, setSucesso] = useState('')

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  // ── Handlers de criação ──
  const handleCriarLancamento = async (dados: { lote_id: string; data: string; num_animais: number | null; peso_medio_kg: number | null; observacao: string | null }) => {
    const payload: FormPayload = {
      lote_id: dados.lote_id, data: dados.data,
      num_animais: dados.num_animais, peso_medio_kg: dados.peso_medio_kg,
      tipo_pesagem: 'real', observacao: dados.observacao,
      atividades: []
    }
    const res = await fetch('/api/manejo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    mostrarSucesso('Lançamento registrado com sucesso!')
    setModoCriar(null)
    router.refresh()
  }

  const handleCriarAtividade = async (dados: { lote_id: string; data: string; tipo: string; produtos_ids: string[] }) => {
    const payload: FormPayload = {
      lote_id: dados.lote_id, data: dados.data,
      num_animais: null, peso_medio_kg: null,
      tipo_pesagem: 'real', observacao: null,
      atividades: [{ tipo: dados.tipo, produtos_ids: dados.produtos_ids }]
    }
    const res = await fetch('/api/manejo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    mostrarSucesso('Atividade registrada com sucesso!')
    setModoCriar(null)
    router.refresh()
  }

  // ── Handlers de edição ──
  const handleEditarLancamento = async (id: string, dados: { lote_id: string; data: string; num_animais: number | null; peso_medio_kg: number | null; observacao: string | null }) => {
    const res = await fetch(`/api/manejo/lancamentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModoEditar(null)
    mostrarSucesso('Lançamento atualizado com sucesso!')
    router.refresh()
  }

  const handleExcluirLancamento = async (id: string) => {
    const res = await fetch(`/api/manejo/lancamentos/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModoEditar(null)
    mostrarSucesso('Lançamento excluído com sucesso!')
    router.refresh()
  }

  const handleEditarAtividade = async (id: string, dados: { lote_id: string; data: string; tipo: string; produtos_ids: string[] }) => {
    const res = await fetch(`/api/manejo/atividades/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModoEditar(null)
    mostrarSucesso('Atividade atualizada com sucesso!')
    router.refresh()
  }

  const handleExcluirAtividade = async (id: string) => {
    const res = await fetch(`/api/manejo/atividades/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModoEditar(null)
    mostrarSucesso('Atividade excluída com sucesso!')
    router.refresh()
  }

  // ── Filtros ──
  const handleFiltrar = () => {
    const params = new URLSearchParams()
    if (dataInicio) params.set('de', dataInicio)
    if (dataFim) params.set('ate', dataFim)
    if (filtroLote) params.set('lote', filtroLote)
    if (filtroTipo && filtroTipo !== 'todos') params.set('tipo', filtroTipo)
    router.push(`/dashboard/manejo?${params.toString()}`)
  }

  const handleLimparFiltros = () => {
    setDataInicio(''); setDataFim(''); setFiltroLote(''); setFiltroTipo('todos')
    router.push('/dashboard/manejo')
  }

  const temFiltroAtivo = !!(filtros.de || filtros.ate || filtros.lote || filtros.tipo)
  const temRegistros = lancamentos.length > 0 || atividadesRegistradas.length > 0

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      {/* Botões para abrir formulários de criação */}
      {modoCriar === null && modoEditar === null && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setModoCriar('atividade')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold hover:bg-[#1a3009] transition-colors"
          >
            + Atividade
          </button>
          <button
            onClick={() => setModoCriar('lancamento')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-[var(--primary)] text-[var(--primary)] rounded-lg font-poppins font-semibold hover:bg-gray-50 transition-colors"
          >
            + Atualizações do Lote
          </button>
        </div>
      )}

      {/* Formulários de criação */}
      {modoCriar === 'lancamento' && (
        <LancamentoForm
          modo={{ tipo: 'criar' }}
          lotes={lotes}
          onSalvar={handleCriarLancamento}
          onCancelar={() => setModoCriar(null)}
        />
      )}

      {modoCriar === 'atividade' && (
        <AtividadeForm
          modo={{ tipo: 'criar' }}
          lotes={lotes}
          produtosDisponiveis={produtosDisponiveis}
          onSalvar={handleCriarAtividade}
          onCancelar={() => setModoCriar(null)}
        />
      )}

      {/* Filtros */}
      {modoCriar === null && modoEditar === null && (temRegistros || temFiltroAtivo) && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">A partir de</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">Até</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">Lote</label>
              <select value={filtroLote} onChange={(e) => setFiltroLote(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition bg-white">
                <option value="">Todos os lotes</option>
                {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition bg-white">
                <option value="todos">Todos</option>
                <option value="lancamentos">Lançamentos de Pesagem</option>
                <option value="atividades">Atividades</option>
              </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleFiltrar}
                className="flex-1 sm:flex-none px-4 py-2 bg-[var(--primary-light)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[var(--primary)] transition-colors">
                Filtrar
              </button>
              {temFiltroAtivo && (
                <button onClick={handleLimparFiltros}
                  className="flex-1 sm:flex-none px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-300 transition-colors">
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cards de registros */}
      {modoCriar === null && temRegistros && (
        <div className="space-y-6">
          {/* Lançamentos de Pesagem */}
          {lancamentos.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[var(--text)] font-poppins mb-3 flex items-center gap-2">
                ⚖️ Lançamentos de Pesagem
                <span className="text-xs font-normal text-gray-400">({lancamentos.length})</span>
              </h2>
              <div className="space-y-2">
                {lancamentos.map((r) => {
                  const isEditando = modoEditar && 'registro' in modoEditar && modoEditar.registro.id === r.id && 'num_animais' in modoEditar.registro
                  return (
                    <div key={r.id}>
                      {isEditando ? (
                        <LancamentoForm
                          modo={{ tipo: 'editar', registro: r }}
                          lotes={lotes}
                          onSalvar={(dados) => handleEditarLancamento(r.id, dados)}
                          onExcluir={() => handleExcluirLancamento(r.id)}
                          onCancelar={() => setModoEditar(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setModoEditar({ tipo: 'editar', registro: r })}
                          className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text)] font-poppins">{r.lote?.nome || 'Lote'}</p>
                            <p className="text-xs text-gray-500 font-poppins mt-0.5">
                              📅 {formatarData(r.data)}
                              {r.num_animais != null && ` · ${r.num_animais} animais`}
                              {r.observacao && ` · ${r.observacao}`}
                            </p>
                          </div>
                          {r.peso_medio_kg != null && (
                            <div className="text-right shrink-0">
                              <span className="text-lg font-bold text-[var(--accent)] font-poppins">{Number(r.peso_medio_kg).toFixed(1)}</span>
                              <span className="text-xs text-gray-500 font-poppins ml-1">kg/cab</span>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Atividades Realizadas */}
          {atividadesRegistradas.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[var(--text)] font-poppins mb-3 flex items-center gap-2">
                🩺 Atividades Realizadas
                <span className="text-xs font-normal text-gray-400">({atividadesRegistradas.length})</span>
              </h2>
              <div className="space-y-2">
                {atividadesRegistradas.map((a) => {
                  const isEditando = modoEditar && 'registro' in modoEditar && modoEditar.registro.id === a.id && 'tipo' in modoEditar.registro
                  return (
                    <div key={a.id}>
                      {isEditando ? (
                        <AtividadeForm
                          modo={{ tipo: 'editar', registro: a }}
                          lotes={lotes}
                          produtosDisponiveis={produtosDisponiveis}
                          onSalvar={(dados) => handleEditarAtividade(a.id, dados)}
                          onExcluir={() => handleExcluirAtividade(a.id)}
                          onCancelar={() => setModoEditar(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setModoEditar({ tipo: 'editar', registro: a })}
                          className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text)] font-poppins">{a.lote?.nome || 'Lote'}</p>
                            <p className="text-xs text-gray-500 font-poppins mt-0.5">📅 {formatarData(a.data)}</p>
                          </div>
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold font-poppins border border-green-200">
                              {EMOJI_ATIVIDADE[a.tipo] || '📋'} {a.tipo}
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {modoCriar === null && !temRegistros && (
        <div className="text-center py-16 text-gray-400 font-poppins">
          <p className="text-4xl mb-3">🐄</p>
          <p className="text-base">{temFiltroAtivo ? 'Nenhum registro encontrado para os filtros selecionados.' : 'Nenhum registro de manejo encontrado.'}</p>
          <p className="text-sm mt-1">{temFiltroAtivo ? 'Tente alterar os filtros ou limpar a busca.' : 'Clique em uma das opções acima para começar.'}</p>
        </div>
      )}
    </div>
  )
}
