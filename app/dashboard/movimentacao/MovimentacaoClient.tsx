'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export type Movimentacao = {
  id: string
  data: string
  tipo_operacao: 'Entrada' | 'Saída'
  media_altura: number | null
  altura1: number | null
  altura2: number | null
  altura3: number | null
  altura4: number | null
  altura5: number | null
  observacao: string | null
  lote_id: string
  piquete_id: string
  qualidade: 'Bom' | 'Sementado' | 'Seco' | null
  foto_url: string | null
  lote: { nome: string }
  piquete: { nome: string }
}

export type PiqueteDescanso = {
  piquete_id: string
  nome: string
  diasDescanso: number
}

type Lote = { id: string; nome: string }
type Piquete = { id: string; nome: string }
type AlturaKey = 'altura1' | 'altura2' | 'altura3' | 'altura4' | 'altura5'
type Modo = { tipo: 'criar' } | { tipo: 'editar'; registro: Movimentacao }

const ALTURAS: AlturaKey[] = ['altura1', 'altura2', 'altura3', 'altura4', 'altura5']

function calcularMedia(alturas: Record<AlturaKey, string>): string {
  const vals = ALTURAS.map((k) => Number(alturas[k])).filter((v) => !isNaN(v) && v > 0)
  if (vals.length !== 5) return ''
  return (vals.reduce((a, b) => a + b, 0) / 5).toFixed(1)
}

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

type FormPayload = {
  data: string; lote_id: string; piquete_id: string
  tipo_operacao: 'Entrada' | 'Saída'
  qualidade: 'Bom' | 'Sementado' | 'Seco' | ''
  observacao: string | null
  altura1: number | null; altura2: number | null; altura3: number | null; altura4: number | null; altura5: number | null
  foto_url: string | null
}

function MovimentacaoForm({
  modo, lotes, piquetes, piqueteAtualPorLote, piquetesOcupados,
  onSalvar, onExcluir, onCancelar,
}: {
  modo: Modo
  lotes: Lote[]
  piquetes: Piquete[]
  piqueteAtualPorLote: Record<string, string>
  piquetesOcupados: string[]
  onSalvar: (dados: FormPayload) => Promise<void>
  onExcluir?: () => Promise<void>
  onCancelar: () => void
}) {
  const editando = modo.tipo === 'editar'
  const inicial = editando ? modo.registro : null
  const hoje = new Date().toISOString().split('T')[0]

  const [data, setData] = useState(inicial?.data ?? hoje)
  const [loteId, setLoteId] = useState(inicial?.lote_id ?? '')
  const [piqueteId, setPiqueteId] = useState(inicial?.piquete_id ?? '')
  const [tipo, setTipo] = useState<'Entrada' | 'Saída' | ''>(inicial?.tipo_operacao ?? '')
  const [qualidade, setQualidade] = useState<'Bom' | 'Sementado' | 'Seco' | ''>(inicial?.qualidade ?? '')
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '')
  const [alturas, setAlturas] = useState<Record<AlturaKey, string>>({
    altura1: inicial?.altura1?.toString() ?? '',
    altura2: inicial?.altura2?.toString() ?? '',
    altura3: inicial?.altura3?.toString() ?? '',
    altura4: inicial?.altura4?.toString() ?? '',
    altura5: inicial?.altura5?.toString() ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [erro, setErro] = useState('')

  // --- Foto do piquete ---
  const [fotoPath, setFotoPath] = useState<string | null>(inicial?.foto_url ?? null)
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null)
  const [fotoLocalPreview, setFotoLocalPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [excluindoFoto, setExcluindoFoto] = useState(false)
  const [fotoLightbox, setFotoLightbox] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Gera signed URL para fotos existentes
  useEffect(() => {
    if (!fotoPath) { setFotoPreviewUrl(null); return }
    // Se temos preview local, usamos ele em vez de gerar URL
    if (fotoLocalPreview) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/movimentacao/imagem/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fotoPath }),
        })
        if (!res.ok) return
        const { url } = await res.json()
        if (!cancelled) setFotoPreviewUrl(url)
      } catch { /* silently fail */ }
    })()
    return () => { cancelled = true }
  }, [fotoPath, fotoLocalPreview])

  const handleUploadFoto = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErro('A imagem excede o limite de 50 MB.')
      return
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      setErro('Formato não suportado. Use JPEG, PNG ou WebP.')
      return
    }

    // Preview local imediato
    const localUrl = URL.createObjectURL(file)
    setFotoLocalPreview(localUrl)
    setUploadingFoto(true)
    setErro('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/movimentacao/imagem', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setFotoPath(json.path)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar imagem')
      setFotoLocalPreview(null)
      URL.revokeObjectURL(localUrl)
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleExcluirFoto = async () => {
    if (!fotoPath) return
    setExcluindoFoto(true)
    setErro('')
    try {
      const res = await fetch('/api/movimentacao/imagem', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fotoPath }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (fotoLocalPreview) URL.revokeObjectURL(fotoLocalPreview)
      setFotoPath(null)
      setFotoPreviewUrl(null)
      setFotoLocalPreview(null)
      setFotoLightbox(false)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir imagem')
    } finally {
      setExcluindoFoto(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUploadFoto(file)
    e.target.value = '' // reset para permitir re-selecionar mesmo arquivo
  }

  const displayUrl = fotoLocalPreview || fotoPreviewUrl

  const mediaPreview = calcularMedia(alturas)

  // Ao editar uma Entrada, o piquete original não deve ser filtrado como "ocupado"
  const piquetesOcupadosFiltrados = editando && inicial?.tipo_operacao === 'Entrada'
    ? piquetesOcupados.filter((pid) => pid !== inicial.piquete_id)
    : piquetesOcupados

  const piquetesFiltrados = tipo === 'Entrada'
    ? piquetes.filter((p) => !piquetesOcupadosFiltrados.includes(p.id))
    : piquetes

  // Lotes filtrados conforme o tipo escolhido
  const lotesFiltrados = editando
    ? lotes
    : !tipo
      ? []
      : tipo === 'Saída'
        ? lotes.filter(l => !!piqueteAtualPorLote[l.id])
        : lotes.filter(l => !piqueteAtualPorLote[l.id])

  const piqueteAutoPreenchido = tipo === 'Saída' && !!loteId && !!piqueteAtualPorLote[loteId]

  const alturasPreenchidas = ALTURAS.filter((k) => alturas[k] !== '')
  const alturasValidas = alturasPreenchidas.length === 0 || alturasPreenchidas.length === 5

  const isValido =
    data !== '' && loteId !== '' && piqueteId !== '' && !!tipo && alturasValidas

  const handleSalvar = async () => {
   if (!isValido) return
   if (tipo !== 'Entrada' && tipo !== 'Saída') return
    setLoading(true)
    setErro('')
    try {
      await onSalvar({
        data,
        lote_id: loteId,
        piquete_id: piqueteId,
        tipo_operacao: tipo,
        qualidade: qualidade,
        observacao: observacao.trim() || null,
        altura1: alturas.altura1 ? Number(alturas.altura1) : null,
        altura2: alturas.altura2 ? Number(alturas.altura2) : null,
        altura3: alturas.altura3 ? Number(alturas.altura3) : null,
        altura4: alturas.altura4 ? Number(alturas.altura4) : null,
        altura5: alturas.altura5 ? Number(alturas.altura5) : null,
        foto_url: fotoPath,
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
        {editando ? 'Editar Movimentação' : 'Nova Movimentação'}
      </h2>

      <div className="space-y-4">
        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Data <span className="text-[var(--error)]">*</span>
          </label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            max={hoje} disabled={loading || excluindo}
            className="w-full sm:w-48 px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2 font-poppins">
            Tipo <span className="text-[var(--error)]">*</span>
          </label>
          <div className="flex gap-3">
            {(['Entrada', 'Saída'] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => {
                  setTipo(t)
                  if (!editando) {
                    setLoteId('')
                    setPiqueteId('')
                  }
                }}
                disabled={loading || excluindo}
                className={`flex-1 py-2.5 rounded-lg font-poppins font-semibold text-sm border-2 transition-colors ${
                  tipo === t
                    ? t === 'Entrada' ? 'bg-green-600 border-green-600 text-white' : 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'Entrada' ? '↓ Entrada' : '↑ Saída'}
              </button>
            ))}
          </div>
        </div>

        {/* Lote */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Lote <span className="text-[var(--error)]">*</span>
            {!tipo && !editando && (
              <span className="ml-2 text-xs text-gray-400 font-normal">selecione o tipo primeiro</span>
            )}
            {tipo === 'Saída' && !editando && lotesFiltrados.length === 0 && (
              <span className="ml-2 text-xs text-amber-600 font-normal">nenhum lote com saída pendente</span>
            )}
            {tipo === 'Entrada' && !editando && lotesFiltrados.length === 0 && (
              <span className="ml-2 text-xs text-amber-600 font-normal">todos os lotes estão em campo</span>
            )}
          </label>
          <select value={loteId}
            onChange={(e) => {
              const novoId = e.target.value
              setLoteId(novoId)
              if (tipo === 'Saída' && novoId) setPiqueteId(piqueteAtualPorLote[novoId] ?? '')
              else setPiqueteId('')
            }}
            disabled={(!tipo && !editando) || loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
          >
            <option value="">{!tipo && !editando ? 'Selecione o tipo primeiro' : 'Selecione um lote...'}</option>
            {lotesFiltrados.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>

        {/* Piquete */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Piquete <span className="text-[var(--error)]">*</span>
            {piqueteAutoPreenchido && (
              <span className="ml-2 text-xs text-[var(--primary-light)] font-normal">(preenchido automaticamente)</span>
            )}
            {tipo === 'Entrada' && piquetesFiltrados.length === 0 && (
              <span className="ml-2 text-xs text-amber-600 font-normal">todos ocupados</span>
            )}
          </label>
          <select value={piqueteId} onChange={(e) => setPiqueteId(e.target.value)}
            disabled={loading || excluindo || piqueteAutoPreenchido}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
          >
            <option value="">Selecione um piquete...</option>
            {piquetesFiltrados.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>


        {/* Qualidade do Solo */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Qualidade do Solo
          </label>
          <select value={qualidade} onChange={(e) => setQualidade(e.target.value as 'Bom' | 'Sementado' | 'Seco' | '')}
            disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition bg-white"
          >
            <option value="">Não informado</option>
            <option value="Bom">Bom</option>
            <option value="Sementado">Sementado</option>
            <option value="Seco">Seco</option>
          </select>
        </div>

        {/* Observação */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Observação
          </label>
          <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional" disabled={loading || excluindo}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
          />
        </div>

        {/* Foto do Piquete */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            📸 Foto do Piquete
          </label>
          <p className="text-xs text-gray-500 font-poppins mb-3">Tire uma foto ou selecione da galeria (máx. 50 MB)</p>

          {/* Inputs de arquivo ocultos */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            id="foto-camera-input"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileChange}
            className="hidden"
            id="foto-galeria-input"
          />

          {!displayUrl && !uploadingFoto && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading || excluindo}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--primary-light)] rounded-xl text-[var(--primary)] font-poppins font-semibold text-sm hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                <span className="text-lg">📷</span>
                Câmera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || excluindo}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-poppins font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <span className="text-lg">🖼️</span>
                Galeria
              </button>
            </div>
          )}

          {uploadingFoto && (
            <div className="flex items-center justify-center gap-3 py-6 bg-gray-50 rounded-xl border-2 border-gray-200">
              <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 font-poppins">Enviando imagem...</span>
            </div>
          )}

          {displayUrl && !uploadingFoto && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => setFotoLightbox(true)}
                className="block w-full rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[var(--primary)] transition-colors"
              >
                <img
                  src={displayUrl}
                  alt="Foto do piquete"
                  className="w-full h-48 object-cover"
                />
              </button>
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setFotoLightbox(true)}
                  className="p-1.5 bg-black/60 rounded-lg text-white text-xs hover:bg-black/80 transition-colors backdrop-blur-sm"
                  title="Ampliar imagem"
                >
                  🔍
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleExcluirFoto() }}
                  disabled={excluindoFoto}
                  className="p-1.5 bg-red-600/80 rounded-lg text-white text-xs hover:bg-red-700 disabled:opacity-50 transition-colors backdrop-blur-sm"
                  title="Excluir imagem"
                >
                  {excluindoFoto ? '⏳' : '🗑️'}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleExcluirFoto().then(() => {
                      // Permitir selecionar nova foto após excluir
                    })
                  }}
                  disabled={excluindoFoto || loading}
                  className="flex-1 py-1.5 text-xs font-poppins font-semibold text-[var(--error)] border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {excluindoFoto ? 'Excluindo...' : '🗑️ Remover foto'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto || loading}
                  className="flex-1 py-1.5 text-xs font-poppins font-semibold text-[var(--primary)] border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
                >
                  🔄 Trocar foto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lightbox */}
        {fotoLightbox && displayUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setFotoLightbox(false)}
          >
            <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={displayUrl}
                alt="Foto do piquete (ampliada)"
                className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleExcluirFoto}
                  disabled={excluindoFoto}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-poppins font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg"
                >
                  {excluindoFoto ? 'Excluindo...' : '🗑️ Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setFotoLightbox(false)}
                  className="px-3 py-1.5 bg-white/90 text-gray-800 rounded-lg font-poppins font-semibold text-sm hover:bg-white transition-colors shadow-lg"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alturas — opcional */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-[var(--text)] mb-1 font-poppins">
            Altura do pasto (cm)
          </label>
          <p className="text-xs text-gray-500 font-poppins mb-3">Tudo ou nada (preencha as 5 ou nenhuma)</p>
          <div className="grid grid-cols-5 gap-2">
            {ALTURAS.map((k, i) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 font-poppins mb-1 text-center">#{i + 1}</label>
                <input type="number" value={alturas[k]}
                  onChange={(e) => setAlturas({ ...alturas, [k]: e.target.value })}
                  placeholder="0" min="0" step="0.1" disabled={loading || excluindo}
                  className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm text-center focus:outline-none focus:border-[var(--primary)] disabled:bg-gray-100 transition"
                />
              </div>
            ))}
          </div>
          {mediaPreview && (
            <div className="mt-3 flex items-center gap-2 text-sm font-poppins text-[var(--primary)]">
              <span className="font-medium">Média:</span>
              <span className="font-bold text-base">{mediaPreview} cm</span>
            </div>
          )}
        </div>
      </div>

      {erro && (
        <div className="mt-3 p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
          {erro}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <div className="flex gap-3">
          <button onClick={handleSalvar} disabled={!isValido || loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-[#1a3009] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar'}
          </button>
          <button onClick={onCancelar} disabled={loading || excluindo}
            className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-poppins font-semibold text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>

        {editando && onExcluir && (
          <div className="border-t border-gray-100 pt-3">
            {!confirmarExclusao ? (
              <button onClick={() => setConfirmarExclusao(true)} disabled={loading || excluindo}
                className="text-sm text-[var(--error)] font-poppins hover:underline disabled:opacity-50"
              >
                Excluir movimentação
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-[var(--error)] font-poppins font-medium">Confirmar exclusão?</p>
                <div className="flex gap-2">
                  <button onClick={handleExcluir} disabled={excluindo}
                    className="px-4 py-1.5 bg-[var(--error)] text-white rounded-lg font-poppins font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                  <button onClick={() => setConfirmarExclusao(false)} disabled={excluindo}
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

export default function MovimentacaoClient({
  movimentacoes, lotes, piquetes, piqueteAtualPorLote, piquetesOcupados, rankingDescanso, de, ate,
}: {
  movimentacoes: Movimentacao[]
  lotes: Lote[]
  piquetes: Piquete[]
  piqueteAtualPorLote: Record<string, string>
  piquetesOcupados: string[]
  rankingDescanso: PiqueteDescanso[]
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

  const handleCriar = async (dados: FormPayload) => {
    const res = await fetch('/api/movimentacao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...dados,
        foto_url: dados.foto_url,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Movimentação registrada com sucesso!')
    router.refresh()
  }

  const handleEditar = async (id: string, dados: FormPayload) => {
    const res = await fetch(`/api/movimentacao/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...dados,
        foto_url: dados.foto_url,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Movimentação atualizada com sucesso!')
    router.refresh()
  }

  const handleExcluir = async (id: string) => {
    const res = await fetch(`/api/movimentacao/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setModo(null)
    mostrarSucesso('Movimentação excluída com sucesso!')
    router.refresh()
  }

  const handleFiltrar = () => {
    const params = new URLSearchParams()
    if (dataInicio) params.set('de', dataInicio)
    if (dataFim) params.set('ate', dataFim)
    router.push(`/dashboard/movimentacao?${params.toString()}`)
  }

  const handleLimparFiltros = () => {
    setDataInicio('')
    setDataFim('')
    router.push('/dashboard/movimentacao')
  }

  const formProps = { lotes, piquetes, piqueteAtualPorLote, piquetesOcupados }

  return (
    <div>
      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-poppins">
          ✅ {sucesso}
        </div>
      )}

      {modo === null && (
        <button onClick={() => setModo({ tipo: 'criar' })}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-poppins font-semibold hover:bg-[#1a3009] transition-colors mb-6"
        >
          + Registrar Movimentação
        </button>
      )}

      {modo?.tipo === 'criar' && (
        <>
          <MovimentacaoForm modo={modo} {...formProps}
            onSalvar={handleCriar} onCancelar={() => setModo(null)}
          />

          {rankingDescanso.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-[var(--text)] font-poppins mb-3 flex items-center gap-2">
                🏆 <span>Piquetes em Descanso</span>
                <span className="text-xs font-normal text-gray-400">({rankingDescanso.length} disponíveis)</span>
              </h3>
              <div className="space-y-2">
                {rankingDescanso.map((p, i) => (
                  <div key={p.piquete_id}
                    className="w-full bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-poppins font-bold text-sm shrink-0 ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-200 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                        </span>
                        <span className="text-sm font-semibold text-[var(--text)] font-poppins">{p.nome}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xl font-bold text-[var(--primary)] font-poppins">{p.diasDescanso}</span>
                        <span className="text-xs text-gray-500 font-poppins ml-1">dias</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rankingDescanso.length === 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-poppins">
              ⚠️ Nenhum piquete em descanso no momento. Todos estão ocupados ou sem movimentação registrada.
            </div>
          )}
        </>
      )}

      {/* Filtro de período */}
      {modo === null && (movimentacoes.length > 0 || de || ate) && (
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

      {modo?.tipo !== 'criar' && (
        movimentacoes.length === 0 && modo === null ? (
          <div className="text-center py-16 text-gray-400 font-poppins">
            <p className="text-4xl mb-3">🐄</p>
            <p className="text-base">Nenhuma movimentação registrada.</p>
            <p className="text-sm mt-1">Clique em "Registrar Movimentação" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {movimentacoes.map((r) => (
              <div key={r.id}>
                {modo?.tipo === 'editar' && modo.registro.id === r.id ? (
                  <MovimentacaoForm modo={modo} {...formProps}
                    onSalvar={(dados) => handleEditar(r.id, dados)}
                    onExcluir={() => handleExcluir(r.id)}
                    onCancelar={() => setModo(null)}
                  />
                ) : (
                  <button onClick={() => setModo({ tipo: 'editar', registro: r })}
                    className="w-full text-left bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full font-poppins ${
                            r.tipo_operacao === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.tipo_operacao === 'Entrada' ? '↓ Entrada' : '↑ Saída'}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text)] font-poppins">{r.lote.nome}</span>
                          <span className="text-xs text-gray-400 font-poppins">→</span>
                          <span className="text-sm text-gray-600 font-poppins">{r.piquete.nome}</span>
                        </div>
                        <div className="flex gap-4 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-500 font-poppins">📅 {formatarData(r.data)}</span>
                          {r.qualidade && (
                            <span className="text-xs text-gray-500 font-poppins">🌱 {r.qualidade}</span>
                          )}
                          {r.media_altura != null && (
                            <span className="text-xs text-gray-500 font-poppins">📏 {Number(r.media_altura).toFixed(1)} cm pasto</span>
                          )}
                          {r.foto_url && (
                            <span className="text-xs text-gray-500 font-poppins">📸 Foto</span>
                          )}
                        </div>
                        {r.observacao && (
                          <p className="text-xs text-gray-400 font-poppins mt-1">{r.observacao}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
