'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type AtividadeProduto = {
  id: string
  produto_id: string
  produto: { nome: string } | null
  volume: number | null
  unidade: string | null
  quantidade_unidade: number | null
}

export type Atividade = {
  id: string
  data: string
  tipo: 'Adubação' | 'Herbicida' | 'Roçagem'
  modalidade: string
  piquete_id: string
  piquete: { nome: string } | null
  produtos: AtividadeProduto[]
  observacao: string | null
}

type Modo = { tipo: 'criar' } | { tipo: 'editar'; atividade: Atividade }

type TipoAtividade = 'Adubação' | 'Herbicida' | 'Roçagem'

const MODALIDADES: Record<TipoAtividade, string[]> = {
  Adubação: ['Manual', 'Trator'],
  Herbicida: ['Manual', 'Trator'],
  Roçagem: ['Manual', 'Trator'],
}

const UNIDADES: Record<string, string[]> = {
  Adubação: ['Sacos', 'Kg'],
  Herbicida: ['Baldes', 'Jatão'],
}

const VOLUME_OPCOES: Record<string, number[]> = {
  'Herbicida-Baldes': [5, 10, 15, 20],
  'Herbicida-Jatão': [100, 150, 200, 250, 300, 350, 400],
  'Adubação-Sacos': [25, 30, 40, 50],
  'Adubação-Kg': Array.from({ length: 20 }, (_, i) => (i + 1) * 5),
}

const TIPOS: TipoAtividade[] = ['Adubação', 'Herbicida', 'Roçagem']

const TIPO_ICONS: Record<TipoAtividade, string> = {
  Adubação: '🌱',
  Herbicida: '🧴',
  Roçagem: '🌿',
}

const TIPO_CORES: Record<string, string> = {
  Adubação: 'bg-green-100 text-green-700',
  Herbicida: 'bg-blue-100 text-blue-700',
  Roçagem: 'bg-yellow-100 text-yellow-700',
}

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

type ProdutoFormItem = {
  key: number
  produto_id: string
  volume: string
  unidade: string
  quantidade_unidade: string
}

type FormPayload = {
  data: string
  tipo: TipoAtividade
  modalidade: string
  piquete_id: string
  produtos: { produto_id: string; volume: number | null; unidade: string | null; quantidade_unidade: number | null }[]
  observacao: string | null
}

function ProdutoRow({
  item,
  tipo,
  produtosDisponiveis,
  disabled,
  onChange,
  onRemove,
  showRemove,
}: {
  item: ProdutoFormItem
  tipo: TipoAtividade
  produtosDisponiveis: { id: string; nome: string; categoria: string }[]
  disabled: boolean
  onChange: (updated: ProdutoFormItem) => void
  onRemove: () => void
  showRemove: boolean
}) {
  const temUnidade = tipo === 'Adubação' || tipo === 'Herbicida'
  const unidades = UNIDADES[tipo] || []
  const volumeOpcoes = tipo && item.unidade ? (VOLUME_OPCOES[`${tipo}-${item.unidade}`] ?? null) : null
  const exigeQtd = temUnidade && (item.unidade === 'Sacos' || item.unidade === 'Baldes')

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 font-poppins uppercase tracking-wide">Produto</span>
        {showRemove && (
          <button type="button" onClick={onRemove} disabled={disabled} className="text-xs text-[var(--error)] font-poppins hover:underline disabled:opacity-50">
            ✕ Remover
          </button>
        )}
      </div>
      <select
        value={item.produto_id}
        onChange={(e) => onChange({ ...item, produto_id: e.target.value })}
        disabled={disabled}
        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
      >
        <option value="">Selecione o produto...</option>
        {produtosDisponiveis.filter(p => p.categoria === tipo).map((p) => (
          <option key={p.id} value={p.id}>{p.nome}</option>
        ))}
      </select>

      {temUnidade && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 font-poppins">Unidade *</label>
            <div className="flex gap-1.5">
              {unidades.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChange({ ...item, unidade: u, volume: '', quantidade_unidade: '' })}
                  disabled={disabled}
                  className={`flex-1 px-2 py-1.5 rounded-lg font-poppins text-xs border-2 transition-colors ${
                    item.unidade === u
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white font-semibold'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 font-poppins">Volume *</label>
            {volumeOpcoes ? (
              <select
                value={item.volume}
                onChange={(e) => onChange({ ...item, volume: e.target.value })}
                disabled={disabled}
                className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg font-poppins text-xs focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
              >
                <option value="">Selecione...</option>
                {volumeOpcoes.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={item.volume}
                onChange={(e) => onChange({ ...item, volume: e.target.value })}
                placeholder="Qtd."
                min="0"
                step="0.1"
                disabled={disabled}
                className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg font-poppins text-xs focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
              />
            )}
          </div>
          {exigeQtd && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1 font-poppins">
                Quantidade ({item.unidade}) *
              </label>
              <input
                type="number"
                value={item.quantidade_unidade}
                onChange={(e) => onChange({ ...item, quantidade_unidade: e.target.value })}
                placeholder={`Quantos ${item.unidade?.toLowerCase()}?`}
                min="0"
                disabled={disabled}
                className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg font-poppins text-xs focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

let _keyCounter = 0
function nextKey() { return ++_keyCounter }

function AtividadeForm({
  modo,
  produtos,
  piquetes,
  onSalvar,
  onExcluir,
  onCancelar,
}: {
  modo: Modo
  produtos: { id: string, nome: string, categoria: string }[]
  piquetes: { id: string, nome: string }[]
  onSalvar: (dados: FormPayload) => Promise<void>
  onExcluir?: () => Promise<void>
  onCancelar: () => void
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.atividade : null
  const hoje = new Date().toISOString().split('T')[0]

  const [data, setData] = useState(inicial?.data ?? hoje)
  const [piqueteId, setPiqueteId] = useState(inicial?.piquete_id ?? '')
  const [tipo, setTipo] = useState<TipoAtividade | ''>(inicial?.tipo ?? '')
  const [modalidade, setModalidade] = useState(inicial?.modalidade ?? '')
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '')

  const buildInitialProdutos = (): ProdutoFormItem[] => {
    if (inicial && inicial.produtos.length > 0) {
      return inicial.produtos.map(p => ({
        key: nextKey(),
        produto_id: p.produto_id,
        volume: p.volume?.toString() ?? '',
        unidade: p.unidade ?? '',
        quantidade_unidade: p.quantidade_unidade?.toString() ?? '',
      }))
    }
    return [{ key: nextKey(), produto_id: '', volume: '', unidade: '', quantidade_unidade: '' }]
  }

  const [produtosList, setProdutosList] = useState<ProdutoFormItem[]>(buildInitialProdutos)

  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  const temProduto = tipo === 'Herbicida' || tipo === 'Adubação'
  const produtoObrigatorio = tipo === 'Herbicida'
  const temUnidade = tipo === 'Adubação' || tipo === 'Herbicida'

  const isProdutosValido = () => {
    if (!temProduto) return true
    if (produtoObrigatorio && produtosList.every(p => !p.produto_id)) return false
    const preenchidos = produtosList.filter(p => p.produto_id)
    if (produtoObrigatorio && preenchidos.length === 0) return false
    for (const p of preenchidos) {
      if (temUnidade) {
        if (!p.unidade || !p.volume) return false
        if ((p.unidade === 'Sacos' || p.unidade === 'Baldes') && !p.quantidade_unidade) return false
      }
    }
    return true
  }

  const isValido =
    data !== '' &&
    piqueteId !== '' &&
    tipo !== '' &&
    modalidade !== '' &&
    isProdutosValido()

  const handleTipo = (t: TipoAtividade) => {
    setTipo(t)
    setModalidade('')
    setProdutosList([{ key: nextKey(), produto_id: '', volume: '', unidade: '', quantidade_unidade: '' }])
  }

  const addProduto = () => {
    setProdutosList(prev => [...prev, { key: nextKey(), produto_id: '', volume: '', unidade: '', quantidade_unidade: '' }])
  }

  const removeProduto = (key: number) => {
    setProdutosList(prev => prev.filter(p => p.key !== key))
  }

  const updateProduto = (key: number, updated: ProdutoFormItem) => {
    setProdutosList(prev => prev.map(p => p.key === key ? updated : p))
  }

  const handleSalvar = async () => {
    if (!isValido || !tipo) return
    setLoading(true)
    setErro('')
    try {
      const prods = temProduto
        ? produtosList.filter(p => p.produto_id).map(p => ({
            produto_id: p.produto_id,
            volume: temUnidade && p.volume ? Number(p.volume) : null,
            unidade: temUnidade && p.unidade ? p.unidade : null,
            quantidade_unidade: temUnidade && (p.unidade === 'Sacos' || p.unidade === 'Baldes') && p.quantidade_unidade ? Number(p.quantidade_unidade) : null,
          }))
        : []
      await onSalvar({
        data,
        piquete_id: piqueteId,
        tipo,
        modalidade,
        produtos: prods,
        observacao: observacao.trim() || null,
      })
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
        {editando ? 'Editar Atividade' : 'Nova Atividade no Campo'}
      </h2>

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
              disabled={loading || excluindo}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
            />
          </div>

          {/* Piquete */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
              Piquete <span className="text-[var(--error)]">*</span>
            </label>
            <select
              value={piqueteId}
              onChange={(e) => setPiqueteId(e.target.value)}
              disabled={loading || excluindo}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
            >
              <option value="">Selecione...</option>
              {piquetes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2 font-poppins">
            Tipo <span className="text-[var(--error)]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTipo(t)}
                disabled={loading || excluindo}
                className={`py-2.5 px-2 rounded-lg font-poppins font-semibold text-sm border-2 transition-colors flex flex-col items-center gap-1 ${
                  tipo === t
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{TIPO_ICONS[t]}</span>
                <span className="text-xs leading-tight text-center">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modalidade */}
        {tipo !== '' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2 font-poppins">
              Modalidade <span className="text-[var(--error)]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MODALIDADES[tipo].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidade(m)}
                  disabled={loading || excluindo}
                  className={`px-4 py-2 rounded-lg font-poppins text-sm border-2 transition-colors ${
                    modalidade === m
                      ? 'bg-[var(--primary-light)] border-[var(--primary-light)] text-white font-semibold'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Produtos (somente Adubação e Herbicida) */}
        {temProduto && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text)] font-poppins">
                Produtos{' '}
                {produtoObrigatorio
                  ? <span className="text-[var(--error)]">*</span>
                  : <span className="text-gray-400 font-normal">(opcional)</span>
                }
              </label>
              <button
                type="button"
                onClick={addProduto}
                disabled={loading || excluindo}
                className="text-xs font-semibold text-[var(--primary)] font-poppins hover:underline disabled:opacity-50"
              >
                + Adicionar produto
              </button>
            </div>
            <div className="space-y-2">
              {produtosList.map((item) => (
                <ProdutoRow
                  key={item.key}
                  item={item}
                  tipo={tipo as TipoAtividade}
                  produtosDisponiveis={produtos}
                  disabled={loading || excluindo}
                  onChange={(updated) => updateProduto(item.key, updated)}
                  onRemove={() => removeProduto(item.key)}
                  showRemove={produtosList.length > 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Observação */}
        {tipo !== '' && (
          <div>
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
        )}
      </div>

      {erro && (
        <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
          {erro}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
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
                Excluir atividade
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
                    className="px-4 py-1.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
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

export default function AtividadesClient({ 
  atividades, 
  produtosDisponiveis,
  piquetesDisponiveis
}: { 
  atividades: Atividade[], 
  produtosDisponiveis: { id: string, nome: string, categoria: string }[],
  piquetesDisponiveis: { id: string, nome: string }[]
}) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo | null>(null)
  const [sucesso, setSucesso] = useState('')
  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  
  const [mesAtual, setMesAtual] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg)
    setTimeout(() => setSucesso(''), 3000)
  }

  const handleCriar = async (dados: FormPayload) => {
    const res = await fetch('/api/atividades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Atividade registrada com sucesso!')
    router.refresh()
  }

  const handleEditar = async (id: string, dados: FormPayload) => {
    const res = await fetch(`/api/atividades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Atividade atualizada com sucesso!')
    router.refresh()
  }

  const handleExcluir = async (id: string) => {
    const res = await fetch(`/api/atividades/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Atividade excluída com sucesso!')
    router.refresh()
  }

  const atividadesAgrupadas = atividades.reduce((acc, ativ) => {
    if (!acc[ativ.data]) acc[ativ.data] = []
    acc[ativ.data].push(ativ)
    return acc
  }, {} as Record<string, Atividade[]>)

  const year = mesAtual.getFullYear()
  const month = mesAtual.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const diasCalendario: (string | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    diasCalendario.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const mStr = String(month + 1).padStart(2, '0')
    const dStr = String(i).padStart(2, '0')
    diasCalendario.push(`${year}-${mStr}-${dStr}`)
  }

  const mesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const hojeStr = new Date().toLocaleDateString('en-CA')

  const currentYear = new Date().getFullYear()
  let minYear = currentYear
  let maxYear = currentYear

  if (atividades.length > 0) {
    const anosRegistrados = atividades.map(a => parseInt(a.data.substring(0, 4), 10))
    minYear = Math.min(...anosRegistrados, currentYear)
    maxYear = Math.max(...anosRegistrados, currentYear)
  }

  const anosDisponiveis = []
  for (let i = minYear; i <= maxYear; i++) {
    anosDisponiveis.push(i)
  }

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      {modo === null && atividades.length > 0 && (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <button
            onClick={() => setModo({ tipo: 'criar' })}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold hover:bg-[#1a3009] transition-colors"
          >
            + Registrar Atividade
          </button>

          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setView('lista')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-poppins font-semibold transition-colors ${view === 'lista' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-poppins font-semibold transition-colors ${view === 'calendario' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calendário
            </button>
          </div>
        </div>
      )}

      {modo === null && atividades.length === 0 && (
        <button
          onClick={() => setModo({ tipo: 'criar' })}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold hover:bg-[#1a3009] transition-colors mb-6"
        >
          + Registrar Atividade
        </button>
      )}

      {modo?.tipo === 'criar' && (
        <AtividadeForm
          modo={modo}
          produtos={produtosDisponiveis}
          piquetes={piquetesDisponiveis}
          onSalvar={handleCriar}
          onCancelar={() => setModo(null)}
        />
      )}

      {atividades.length === 0 && modo === null ? (
        <div className="text-center py-16 text-gray-400 font-poppins">
          <p className="text-4xl mb-3">🚜</p>
          <p className="text-base">Nenhuma atividade registrada.</p>
          <p className="text-sm mt-1">Clique em "Registrar Atividade" para começar.</p>
        </div>
      ) : (
        <>
          {view === 'lista' && (
            <div className="space-y-3">
              {atividades.map((a) => (
                <div key={a.id}>
                  {modo?.tipo === 'editar' && modo.atividade.id === a.id ? (
                    <AtividadeForm
                      modo={modo}
                      produtos={produtosDisponiveis}
                      piquetes={piquetesDisponiveis}
                      onSalvar={(dados) => handleEditar(a.id, dados)}
                      onExcluir={() => handleExcluir(a.id)}
                      onCancelar={() => setModo(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setModo({ tipo: 'editar', atividade: a })}
                      className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full font-poppins ${TIPO_CORES[a.tipo]}`}>
                              {TIPO_ICONS[a.tipo as TipoAtividade]} {a.tipo}
                            </span>
                            <span className="text-sm font-semibold text-[var(--text)] font-poppins">
                              {a.modalidade}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-gray-500 font-poppins">
                              📅 {formatarData(a.data)}
                            </span>
                            {a.piquete && (
                              <span className="text-xs text-gray-500 font-poppins">
                                📍 Piquete: {a.piquete.nome}
                              </span>
                            )}
                            {a.produtos.length > 0 && (
                              <span className="text-xs text-gray-500 font-poppins">
                                🧪 {a.produtos.map(p => p.produto?.nome).filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                          {a.produtos.length > 0 && a.produtos.some(p => p.volume != null) && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {a.produtos.filter(p => p.volume != null && p.unidade).map((p, i) => (
                                <span key={i} className="text-xs text-gray-500 font-poppins">
                                  📦 {p.produto?.nome}: {p.volume} {p.unidade}{p.quantidade_unidade ? ` (${p.quantidade_unidade})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {a.observacao && (
                            <p className="text-xs text-gray-400 font-poppins mt-1">{a.observacao}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {view === 'calendario' && modo === null && (
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                {/* Header do Calendário */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <button onClick={() => { setMesAtual(new Date(year, month - 1, 1)); setDiaSelecionado(null) }} className="px-3 py-1.5 hover:bg-gray-50 rounded-lg text-gray-600 font-poppins font-medium text-sm transition-colors border border-gray-200">
                    ← Anterior
                  </button>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-[var(--primary)] font-poppins text-base sm:text-lg hidden sm:block">
                      {mesNomes[month]} {year}
                    </h3>
                    <input
                      type="date"
                      value={diaSelecionado || (
                        year === currentYear && month === new Date().getMonth() 
                          ? hojeStr 
                          : `${year}-${String(month + 1).padStart(2, '0')}-01`
                      )}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [y, m] = e.target.value.split('-')
                          setMesAtual(new Date(Number(y), Number(m) - 1, 1))
                          setDiaSelecionado(e.target.value)
                        }
                      }}
                      className="w-[140px] px-2 py-1.5 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition bg-white"
                    />
                  </div>
                  <button onClick={() => { setMesAtual(new Date(year, month + 1, 1)); setDiaSelecionado(null) }} className="px-3 py-1.5 hover:bg-gray-50 rounded-lg text-gray-600 font-poppins font-medium text-sm transition-colors border border-gray-200">
                    Próximo →
                  </button>
                </div>
                
                {/* Cabeçalho dos dias */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 text-center">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="py-2.5 text-xs font-bold text-gray-500 font-poppins tracking-wide uppercase">
                      {d}
                    </div>
                  ))}
                </div>
                
                {/* Células */}
                <div className="grid grid-cols-7 auto-rows-[80px] sm:auto-rows-[110px]">
                  {diasCalendario.map((dateStr, i) => {
                    if (!dateStr) return <div key={`empty-${i}`} className="border-b border-r border-gray-50 bg-gray-50/30"></div>
                    
                    const ativs = atividadesAgrupadas[dateStr] || []
                    const isSelected = diaSelecionado === dateStr
                    const isToday = dateStr === hojeStr
                    
                    return (
                      <button 
                        key={dateStr}
                        onClick={() => {
                          if (ativs.length > 0) {
                            setDiaSelecionado(isSelected ? null : dateStr)
                          }
                        }}
                        disabled={ativs.length === 0}
                        className={`relative border-b border-r border-gray-100 p-1.5 sm:p-2 flex flex-col items-start overflow-hidden transition-all
                          ${ativs.length === 0 ? 'bg-white cursor-default' : isSelected ? 'bg-[var(--primary-light)]/10 border-[var(--primary)]/30 ring-inset ring-2 ring-[var(--primary)]/30' : 'hover:bg-gray-50 bg-white cursor-pointer'}
                        `}
                      >
                        <span className={`text-[11px] sm:text-xs font-semibold font-poppins mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--primary)] text-white' : 'text-gray-700'}`}>
                          {dateStr.split('-')[2]}
                        </span>
                        
                        <div className="flex flex-col gap-1 w-full overflow-y-auto scrollbar-hide">
                          {ativs.slice(0, 3).map(a => (
                            <div key={a.id} className={`text-[10px] truncate px-1.5 py-0.5 rounded font-poppins text-left ${TIPO_CORES[a.tipo]}`}>
                              {TIPO_ICONS[a.tipo as TipoAtividade]} <span className="hidden sm:inline">{a.tipo}</span>
                            </div>
                          ))}
                          {ativs.length > 3 && (
                            <div className="text-[10px] text-gray-400 font-poppins font-medium pl-1">
                              +{ativs.length - 3} mais
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detalhes do dia selecionado */}
              {diaSelecionado && atividadesAgrupadas[diaSelecionado] && (
                <div className="bg-white rounded-xl p-5 shadow-md border-l-4 border-l-[var(--primary)]">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-[var(--text)] font-poppins">
                      Atividades em {formatarData(diaSelecionado)}
                    </h4>
                    <button onClick={() => setDiaSelecionado(null)} className="text-gray-400 hover:text-gray-600 text-sm font-poppins">
                      ✕ Fechar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {atividadesAgrupadas[diaSelecionado].map((a) => (
                      <div key={a.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full font-poppins ${TIPO_CORES[a.tipo]}`}>
                            {TIPO_ICONS[a.tipo as TipoAtividade]} {a.tipo}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text)] font-poppins">
                            {a.modalidade}
                          </span>
                        </div>
                        {a.piquete && (
                          <p className="text-[11px] text-gray-600 font-poppins mb-0.5">
                            <span className="font-medium mr-1">📍 Piquete:</span>{a.piquete.nome}
                          </p>
                        )}
                        {a.produtos.length > 0 && a.produtos.map((p, i) => (
                          <p key={i} className="text-[11px] text-gray-600 font-poppins mb-0.5">
                            <span className="font-medium mr-1">🧪 Produto:</span>{p.produto?.nome}
                            {p.volume != null && p.unidade && ` — ${p.volume} ${p.unidade}${p.quantidade_unidade ? ` (${p.quantidade_unidade})` : ''}`}
                          </p>
                        ))}
                        {a.observacao && (
                          <p className="text-[11px] text-gray-500 font-poppins italic mt-1.5 border-t border-gray-200 pt-1.5">
                            "{a.observacao}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}