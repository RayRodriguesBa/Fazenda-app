import { createClient } from '@/app/lib/supabase/server'
import { Home } from 'lucide-react'
import Link from 'next/link'

type ModuleCard = {
  href: string
  icon: string
  title: string
  description: string
  gestorOnly?: boolean
}

const MODULES: ModuleCard[] = [
  {
    href: '/dashboard/chuva',
    icon: '🌧️',
    title: 'Chuva',
    description: 'Registre o volume de chuva diário',
  },
  {
    href: '/dashboard/movimentacao',
    icon: '🐄',
    title: 'Movimentação de Gado',
    description: 'Entrada e saída de lotes nos piquetes',
  },
  {
    href: '/dashboard/cocho',
    icon: '🌾',
    title: 'Cocho',
    description: 'Controle o abastecimento do cocho por lote',
  },
  {
    href: '/dashboard/atividades',
    icon: '🚜',
    title: 'Atividades no Campo',
    description: 'Adubação, herbicida e roçagem',
  },
  {
    href: '/dashboard/lotes',
    icon: '📋',
    title: 'Lotes e Piquetes',
    description: 'Gerenciar lotes de gado e piquetes',
    gestorOnly: true,
  },
  {
    href: '/dashboard/usuarios',
    icon: '👥',
    title: 'Usuários',
    description: 'Criar e gerenciar operadores',
    gestorOnly: true,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfil')
    .select('nome, perfil')
    .eq('id', user!.id)
    .single()

  const isGestor = perfil?.perfil === 'gestor'
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? 'Usuário'

  const visibleModules = MODULES.filter((m) => !m.gestorOnly || isGestor)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--primary)] font-merriweather flex items-center">
          Olá, {primeiroNome}! 👋
        </h1>
        <p className="text-[var(--text)] opacity-70 font-poppins mt-1">
          O que vamos registrar hoje?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group flex items-start gap-4 p-5 bg-white rounded-xl border-2 border-transparent shadow-sm hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
          >
            <div className="text-4xl shrink-0">{module.icon}</div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text)] font-poppins group-hover:text-[var(--primary)] transition-colors">
                {module.title}
              </h2>
              <p className="text-sm text-gray-500 font-poppins mt-0.5">
                {module.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
