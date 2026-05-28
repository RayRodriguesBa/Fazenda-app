import { createClient } from '@/app/lib/supabase/server'
import { CloudRain } from 'lucide-react'
import { cookies } from 'next/headers'
import ChuvaClient, { type RegistroChuva } from './ChuvaClient'

export default async function ChuvaPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const params = await searchParams
  const de = params.de
  const ate = params.ate
  const supabase = await createClient()

  const cookieStore = await cookies()
  const fazendaId = cookieStore.get('fazenda_id')?.value

  let registros: RegistroChuva[] = []
  let error = null

  let diasSemChuva = 0

  if (fazendaId) {
    let query = supabase
      .from('chuva')
      .select('id, data, volume_mm, observacao')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })

    if (de) query = query.gte('data', de)
    if (ate) query = query.lte('data', ate)
    else query = query.limit(50) // Só aplica o limite se não houver filtro 'até' para não quebrar buscas maiores

    const [res, resUltimaChuva] = await Promise.all([
      query,
      supabase
        .from('chuva')
        .select('data')
        .eq('fazenda_id', fazendaId)
        .gt('volume_mm', 0)
        .order('data', { ascending: false })
        .limit(1)
        .single()
    ])
    
    registros = (res.data ?? []) as unknown as RegistroChuva[]
    error = res.error

    if (resUltimaChuva.data?.data) {
      const dataUltima = new Date(resUltimaChuva.data.data)
      const hoje = new Date()
      const diffTime = Math.abs(hoje.getTime() - dataUltima.getTime())
      diasSemChuva = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }
  }

  if (error) console.error('Erro ao buscar chuva:', error)

  const lista: RegistroChuva[] = registros ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          <CloudRain className="inline-block mr-2 w-7 h-7 mb-1" /> Registro de Chuva
        </h1>
        <p className="text-sm text-gray-500 font-poppins mt-1">
          {!fazendaId ? 'Selecione uma fazenda para continuar.' : `Últimos ${lista.length} registros`}
        </p>
      </div>

      <ChuvaClient registros={lista} diasSemChuva={diasSemChuva} de={de} ate={ate} />
    </div>
  )
}
