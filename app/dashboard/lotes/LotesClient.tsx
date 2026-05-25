'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ExcelJS from 'exceljs'


export type Lote = {
  id: string
  nome: string
  descricao: string | null
  num_animais: number | null
  peso_medio_kg: number | null
  sexo: string | null
  ativo: boolean
}

type LotePreview = {
  nome: string
  sexo: string | null
  num_animais: number
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

type Tab = 'lotes' | 'piquetes' | 'analise_pastejo'

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

function MultiSelect({ options, selectedIds, onChange, placeholder }: { options: {id: string, nome: string}[], selectedIds: string[], onChange: (ids: string[]) => void, placeholder: string }) {
  const [open, setOpen] = useState(false)
  
  const toggleId = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="relative">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] transition bg-white flex justify-between items-center text-left"
      >
        <span className="truncate pr-2">
          {selectedIds.length === 0 ? placeholder : `${selectedIds.length} selecionado(s)`}
        </span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
            {options.length === 0 ? (
               <div className="p-2 text-xs text-gray-500 font-poppins text-center">Nenhuma opção</div>
            ) : (
              options.map(opt => (
                <label key={opt.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 relative z-30">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(opt.id)}
                    onChange={() => toggleId(opt.id)}
                    className="mr-2 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-sm font-poppins text-[var(--text)] truncate">{opt.nome}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function LotesClient({
  lotes,
  piquetes,
  movimentacoes,
  isGestor,
}: {
  lotes: Lote[]
  piquetes: Piquete[]
  movimentacoes?: any[]
  isGestor?: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('lotes')
  const [showNovoLote, setShowNovoLote] = useState(false)
  const [showNovoPiquete, setShowNovoPiquete] = useState(false)
  const [editandoLote, setEditandoLote] = useState<Lote | null>(null)
  const [editandoPiquete, setEditandoPiquete] = useState<Piquete | null>(null)
  const [sucesso, setSucesso] = useState('')

  // Estado de importação
  const [importPreview, setImportPreview] = useState<LotePreview[] | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importErro, setImportErro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtros Piquetes
  const [filtroPiqueteIds, setFiltroPiqueteIds] = useState<string[]>([])

  const formatarData = (dataISO: string) => {
    if (!dataISO || dataISO === '?') return '?'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  type Pastejo = {
    lote_id: string
    lote_nome: string
    data_entrada: string
    data_saida: string | null
    altura_entrada: number | null
    altura_saida: number | null
    dias_ocupado: number | null
    dias_descanso_previo?: number | null
  }

  const getPastejos = (piqueteId: string): Pastejo[] => {
    if (!movimentacoes) return []
    const movs = movimentacoes.filter(m => m.piquete_id === piqueteId)
    const pastejos: Pastejo[] = []
    const abertos: Record<string, Pastejo> = {}

    for (const mov of movs) {
      const loteNome = lotes.find(l => l.id === mov.lote_id)?.nome || 'Lote Desconhecido'
      if (mov.tipo_operacao === 'Entrada') {
        const p: Pastejo = {
          lote_id: mov.lote_id,
          lote_nome: loteNome,
          data_entrada: mov.data,
          data_saida: null,
          altura_entrada: mov.media_altura,
          altura_saida: null,
          dias_ocupado: null
        }
        abertos[mov.lote_id] = p
        pastejos.push(p)
      } else if (mov.tipo_operacao === 'Saída') {
        const p = abertos[mov.lote_id]
        if (p) {
          p.data_saida = mov.data
          p.altura_saida = mov.media_altura
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
            altura_entrada: null,
            altura_saida: mov.media_altura,
            dias_ocupado: null
          })
        }
      }
    }

    for (let i = 1; i < pastejos.length; i++) {
      const prev = pastejos[i - 1]
      const curr = pastejos[i]
      if (prev.data_saida && curr.data_entrada !== '?') {
        const d1 = new Date(prev.data_saida)
        const d2 = new Date(curr.data_entrada)
        curr.dias_descanso_previo = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000))
      }
    }

    return pastejos.reverse()
  }

  const piquetesFiltrados = piquetes
    .filter(piquete => {
      if (filtroPiqueteIds.length > 0 && !filtroPiqueteIds.includes(piquete.id)) return false
      return true
    })
    .sort((a, b) => {
      const getStatus = (id: string) => {
        const last = getPastejos(id)[0]
        if (!last) return { isOcupado: false, dias: -1 }
        
        const now = new Date().getTime()
        const isOcupado = !last.data_saida
        
        if (isOcupado) {
          const diasOcupado = last.data_entrada !== '?' 
            ? Math.floor((now - new Date(last.data_entrada).getTime()) / 86400000)
            : (last.dias_ocupado || 0)
          return { isOcupado: true, dias: diasOcupado }
        } else {
          const diasDescanso = last.data_saida
            ? Math.floor((now - new Date(last.data_saida).getTime()) / 86400000)
            : 0
          return { isOcupado: false, dias: diasDescanso }
        }
      }

      const statusA = getStatus(a.id)
      const statusB = getStatus(b.id)

      if (statusA.isOcupado && !statusB.isOcupado) return -1
      if (!statusA.isOcupado && statusB.isOcupado) return 1

      return statusB.dias - statusA.dias
    })

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportErro('')
    setImportLoading(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        setImportErro('A planilha não contém nenhuma aba.')
        setImportLoading(false)
        return
      }

      // Encontrar índices das colunas na primeira linha (header)
      const headerRow = worksheet.getRow(1)
      let colLote = -1
      let colSexo = -1

      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const valor = String(cell.value ?? '').trim().toLowerCase()
        if (valor === 'lote') colLote = colNumber
        if (valor === 'sexo') colSexo = colNumber
      })

      if (colLote === -1) {
        setImportErro('Coluna "Lote" não encontrada na planilha. Verifique se a primeira linha contém os cabeçalhos.')
        setImportLoading(false)
        return
      }

      // Agrupar por nome do lote e contar animais
      const agrupado = new Map<string, { sexo: string | null; count: number }>()

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i)
        const nomeLote = String(row.getCell(colLote).value ?? '').trim()
        if (!nomeLote) continue

        const sexo = colSexo !== -1
          ? String(row.getCell(colSexo).value ?? '').trim() || null
          : null

        const existing = agrupado.get(nomeLote)
        if (existing) {
          existing.count += 1
        } else {
          agrupado.set(nomeLote, { sexo, count: 1 })
        }
      }

      if (agrupado.size === 0) {
        setImportErro('Nenhum dado encontrado na planilha (após a linha de cabeçalho).')
        setImportLoading(false)
        return
      }

      const preview: LotePreview[] = Array.from(agrupado.entries()).map(
        ([nome, { sexo, count }]) => ({
          nome,
          sexo,
          num_animais: count,
        })
      )

      setImportPreview(preview)
    } catch {
      setImportErro('Erro ao ler o arquivo. Verifique se é um arquivo .xlsx válido.')
    } finally {
      setImportLoading(false)
      // Limpar o input para permitir re-selecionar o mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmarImportacao = async () => {
    if (!importPreview) return
    setImportLoading(true)
    setImportErro('')

    try {
      const res = await fetch('/api/lotes/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotes: importPreview }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao importar lotes.')
      }

      const msgs: string[] = []
      if (json.inseridos > 0) msgs.push(`${json.inseridos} lote(s) importado(s)`)
      if (json.ignorados > 0) msgs.push(`${json.ignorados} já existente(s)`)
      mostrarSucesso(msgs.join(', ') + '.')
      setImportPreview(null)
      router.refresh()
    } catch (e: unknown) {
      setImportErro(e instanceof Error ? e.message : 'Erro ao importar.')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(['lotes', 'piquetes', 'analise_pastejo'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setShowNovoLote(false)
              setShowNovoPiquete(false)
              setEditandoLote(null)
              setEditandoPiquete(null)
            }}
            className={`flex-1 py-2 px-2 text-center rounded-lg font-poppins font-semibold text-sm capitalize transition-colors whitespace-nowrap ${
              tab === t
                ? 'bg-white text-[var(--primary)] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'lotes' ? '📋 Lotes' : t === 'piquetes' ? '🗺️ Piquetes (Básico)' : '📊 Análise de Pastejo'}
          </button>
        ))}
      </div>

      {/* Aba Lotes */}
      {tab === 'lotes' && (
        <div>
          {!showNovoLote && !editandoLote && isGestor && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => setShowNovoLote(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] transition-colors"
              >
                + Novo Lote
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-[var(--primary)] text-[var(--primary)] rounded-lg font-poppins font-semibold text-sm hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 transition-colors"
              >
                📥 Importar Excel
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {showNovoLote && (
            <LoteForm
              onSalvar={handleCriarLote}
              onCancelar={() => setShowNovoLote(false)}
            />
          )}

          {/* Modal de prévia da importação */}
          {importPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[var(--primary)] to-[#3a6b1e]">
                  <h3 className="text-lg font-bold text-white font-poppins flex items-center gap-2">
                    📥 Prévia da Importação
                  </h3>
                  <p className="text-sm text-white/80 font-poppins mt-0.5">
                    {importPreview.length} lote(s) encontrado(s) — {importPreview.reduce((a, b) => a + b.num_animais, 0)} animais no total
                  </p>
                </div>

                {/* Tabela */}
                <div className="overflow-y-auto flex-1 px-5 py-3">
                  <table className="w-full text-sm font-poppins">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="py-2 pr-3 font-medium">Lote</th>
                        <th className="py-2 pr-3 font-medium">Sexo</th>
                        <th className="py-2 font-medium text-right">Animais</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((lote, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-3 text-[var(--text)] font-medium">{lote.nome}</td>
                          <td className="py-2 pr-3 text-gray-600">{lote.sexo || '—'}</td>
                          <td className="py-2 text-right text-[var(--primary)] font-semibold">{lote.num_animais}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Erro */}
                {importErro && (
                  <div className="mx-5 mb-2 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
                    {importErro}
                  </div>
                )}

                {/* Ações */}
                <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={handleConfirmarImportacao}
                    disabled={importLoading}
                    className="flex-1 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    {importLoading ? 'Importando...' : `Confirmar (${importPreview.length} lotes)`}
                  </button>
                  <button
                    onClick={() => { setImportPreview(null); setImportErro('') }}
                    disabled={importLoading}
                    className="px-5 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Erro de importação (fora do modal - quando arquivo inválido) */}
          {importErro && !importPreview && (
            <div className="mb-4 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
              ❌ {importErro}
            </div>
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
                          if (isGestor) {
                            setShowNovoLote(false)
                            setEditandoLote(lote)
                          }
                        }}
                        disabled={!isGestor}
                        className={`w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 transition-all duration-200 ${
                          isGestor ? 'hover:border-[var(--primary)] hover:shadow-md cursor-pointer' : 'cursor-default'
                        }`}
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
                            {lote.sexo && (
                              <span className="text-xs text-gray-600 font-poppins">
                                {lote.sexo === 'M' || lote.sexo?.toLowerCase() === 'macho' ? '♂️' : '♀️'} {lote.sexo}
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

      {/* Aba Piquetes (Básico) */}
      {tab === 'piquetes' && (
        <div>
          {!showNovoPiquete && !editandoPiquete && isGestor && (
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
                        if (isGestor) {
                          setShowNovoPiquete(false)
                          setEditandoPiquete(piquete)
                        }
                      }}
                      disabled={!isGestor}
                      className={`w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 transition-all duration-200 ${
                        isGestor ? 'hover:border-[var(--primary)] hover:shadow-md cursor-pointer' : 'cursor-default'
                      }`}
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

      {/* Aba Análise de Pastejo */}
      {tab === 'analise_pastejo' && (
        <div>
          {/* Filtro de Piquetes */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-[var(--text)] mb-1 font-poppins">Piquetes</label>
              <MultiSelect
                options={piquetes.map(p => ({ id: p.id, nome: p.nome }))}
                selectedIds={filtroPiqueteIds}
                onChange={setFiltroPiqueteIds}
                placeholder="Todos"
              />
            </div>
            {filtroPiqueteIds.length > 0 && (
              <div className="w-full sm:w-auto">
                <button onClick={() => setFiltroPiqueteIds([])} className="w-full sm:w-auto px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-300 transition-colors">
                  Limpar
                </button>
              </div>
            )}
          </div>

          {piquetesFiltrados.length === 0 && !showNovoPiquete ? (
            <div className="text-center py-16 text-gray-400 font-poppins">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-base">Nenhum piquete encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {piquetesFiltrados.map((piquete) => {
                if (editandoPiquete?.id === piquete.id) {
                  return (
                    <div key={piquete.id} className="md:col-span-2">
                      <PiqueteForm
                        inicial={piquete}
                        onSalvar={handleEditarPiquete}
                        onCancelar={() => setEditandoPiquete(null)}
                      />
                    </div>
                  )
                }

                const allPastejos = getPastejos(piquete.id)
                const lastPastejo = allPastejos[0]
                const isOcupado = lastPastejo && !lastPastejo.data_saida
                const diasDescanso = (!isOcupado && lastPastejo?.data_saida) ? Math.max(0, Math.floor((new Date().getTime() - new Date(lastPastejo.data_saida).getTime()) / 86400000)) : 0
                const diasOcupado = (isOcupado && lastPastejo?.data_entrada !== '?') ? Math.max(0, Math.floor((new Date().getTime() - new Date(lastPastejo.data_entrada).getTime()) / 86400000)) : (lastPastejo?.dias_ocupado || 0)
                const ultimoPastejoCompleto = allPastejos.find(p => !!p.data_saida) ?? null

                return (
                  <div
                    key={piquete.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/piquete/${piquete.id}`)}
                  >
                    {/* Header Piquete */}
                    <div className={`px-4 py-3 border-b flex justify-between items-center ${isOcupado ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[var(--primary)] font-poppins text-lg">{piquete.nome}</h3>
                          {!piquete.ativo && <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Inativo</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-poppins mt-1 text-gray-600">
                          <span>📐 {piquete.area_ha ?? '--'} ha</span>
                          {piquete.forrageira && <span>🌾 {FORRAGEIRA_LABEL[piquete.forrageira]}</span>}
                          {piquete.aproveitamento_pasto && <span>🌿 {piquete.aproveitamento_pasto}% aprov.</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        {isOcupado ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="bg-green-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm inline-block">
                              Ocupado: {diasOcupado} d
                            </div>
                            {lastPastejo?.dias_descanso_previo != null && lastPastejo.dias_descanso_previo > 0 && (
                              <span className="text-[10px] text-gray-500 font-semibold font-poppins">Descansou: {lastPastejo.dias_descanso_previo} d</span>
                            )}
                          </div>
                        ) : (
                          <div className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm inline-block">
                            Descanso: {diasDescanso} d
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col gap-4">
                      {/* Pastejo Atual */}
                      {isOcupado && lastPastejo && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-poppins mb-2">Pastejo Atual</p>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-xs font-semibold font-poppins text-[var(--text)] bg-gray-100 px-2 py-0.5 rounded">{lastPastejo.lote_nome}</span>
                            <span className="text-[11px] text-gray-500 font-poppins">desde {formatarData(lastPastejo.data_entrada)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-center">
                              <span className="text-[10px] text-gray-500 font-poppins font-bold uppercase tracking-wider block mb-0.5">Altura Entrada</span>
                              <span className="text-lg font-bold text-gray-800 font-poppins">
                                {lastPastejo.altura_entrada ? `${lastPastejo.altura_entrada} cm` : '—'}
                              </span>
                            </div>
                            <div className="bg-[var(--primary-light)]/10 rounded-lg p-2.5 border border-[var(--primary-light)]/30 text-center">
                              <span className="text-[10px] text-[var(--primary)] font-poppins font-bold uppercase tracking-wider block mb-0.5">Altura Saída</span>
                              <span className="text-base font-bold text-[var(--primary)] font-poppins">Em andamento</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Último Pastejo Completo */}
                      {ultimoPastejoCompleto && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-poppins mb-2">Último Pastejo</p>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-xs font-semibold font-poppins text-[var(--text)] bg-white border border-gray-200 px-2 py-0.5 rounded">{ultimoPastejoCompleto.lote_nome}</span>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 font-poppins">
                                {ultimoPastejoCompleto.dias_descanso_previo != null && (
                                  <span>{ultimoPastejoCompleto.dias_descanso_previo} d desc.</span>
                                )}
                                {ultimoPastejoCompleto.dias_ocupado !== null && (
                                  <span>{ultimoPastejoCompleto.dias_ocupado} d ocup.</span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-poppins text-gray-600 mb-2">
                              <p><span className="text-green-600 font-semibold">Entrada:</span> {formatarData(ultimoPastejoCompleto.data_entrada)}</p>
                              <p><span className="text-red-600 font-semibold">Saída:</span> {formatarData(ultimoPastejoCompleto.data_saida!)}</p>
                            </div>
                            {ultimoPastejoCompleto.dias_descanso_previo != null && ultimoPastejoCompleto.dias_descanso_previo > 0 && (
                              <div className="flex items-center gap-1.5 mb-2 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                                <span className="text-amber-500 text-xs">🌿</span>
                                <span className="text-[11px] font-poppins text-amber-700">
                                  <span className="font-bold">{ultimoPastejoCompleto.dias_descanso_previo} dias</span> de descanso antes deste pastejo
                                </span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center bg-white rounded p-1.5 border border-gray-100">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block font-poppins">Alt. Entrada</span>
                                <span className="font-bold text-gray-700 font-poppins text-sm">{ultimoPastejoCompleto.altura_entrada ? `${ultimoPastejoCompleto.altura_entrada} cm` : '—'}</span>
                              </div>
                              <div className="text-center bg-white rounded p-1.5 border border-gray-100">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block font-poppins">Alt. Saída</span>
                                <span className="font-bold text-gray-700 font-poppins text-sm">{ultimoPastejoCompleto.altura_saida ? `${ultimoPastejoCompleto.altura_saida} cm` : '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Estado vazio */}
                      {!isOcupado && !ultimoPastejoCompleto && (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex-1 flex items-center justify-center">
                          <span className="text-xs text-gray-400 font-poppins">Nenhum pastejo registrado.</span>
                        </div>
                      )}

                      {/* Botão de Edição */}
                      {isGestor && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowNovoPiquete(false); setEditandoPiquete(piquete) }}
                          className="mt-auto w-full py-2 text-xs font-semibold text-[var(--primary)] bg-white border border-[var(--primary)] rounded-lg hover:bg-[var(--primary)] hover:text-white transition-colors"
                        >
                          Editar Piquete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
