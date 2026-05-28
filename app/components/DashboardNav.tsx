'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { Home, CloudRain, PawPrint, Syringe, Wheat, Tractor, Package, ClipboardList, Map, Users, LogOut } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  gestorOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/dashboard/chuva', label: 'Chuva', icon: CloudRain },
  { href: '/dashboard/movimentacao', label: 'Gado', icon: PawPrint },
  { href: '/dashboard/manejo', label: 'Manejo', icon: Syringe },
  { href: '/dashboard/cocho', label: 'Cocho', icon: Wheat },
  { href: '/dashboard/atividades', label: 'Atividades', icon: Tractor },
  { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
  { href: '/dashboard/lotes', label: 'Lotes/Piquetes', icon: ClipboardList, gestorOnly: true },
  { href: '/dashboard/fazendas', label: 'Fazendas', icon: Map, gestorOnly: true },
  { href: '/dashboard/usuarios', label: 'Usuários', icon: Users, gestorOnly: true },
]

type Fazenda = {
  id: string
  nome: string
}

type Props = {
  isGestor: boolean
  nome: string
  fazendas: Fazenda[]
  activeFazendaId: string
}

export default function DashboardNav({ isGestor, nome, fazendas, activeFazendaId }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [changingFazenda, setChangingFazenda] = useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => !item.gestorOnly || isGestor)

  const handleLogout = async () => {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleFazendaChange = async (fazendaId: string) => {
    if (fazendaId === activeFazendaId) return
    setChangingFazenda(true)
    
    await fetch('/api/fazendas/ativa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fazenda_id: fazendaId })
    })
    
    // Força o reload completo da aplicação para resetar o estado de todos os Server Components
    window.location.href = '/dashboard'
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* Header — mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--primary)] text-white z-40 shadow-md">
        <div className="flex flex-col px-4 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 font-poppins leading-none">Olá,</p>
              <p className="text-sm font-semibold font-poppins truncate max-w-[200px]">{nome}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-poppins transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Saindo...' : 'Sair'}</span>
            </button>
          </div>

          {/* Seletor de Fazenda Ativa - Mobile */}
          <div className="bg-white/5 rounded-lg p-2 border border-white/10 relative">
            <label className="text-[10px] uppercase tracking-wider text-white/50 font-poppins block mb-1 px-1">Fazenda Ativa</label>
            <select 
              value={activeFazendaId}
              onChange={(e) => handleFazendaChange(e.target.value)}
              disabled={changingFazenda || fazendas.length === 0}
              className="w-full bg-transparent text-white font-poppins text-sm font-semibold focus:outline-none appearance-none cursor-pointer px-1 py-0.5"
            >
              {fazendas.length === 0 && <option value="">Nenhuma fazenda</option>}
              {fazendas.map(f => (
                <option key={f.id} value={f.id} className="text-black">{f.nome}</option>
              ))}
            </select>
            <div className="absolute right-3 top-[26px] pointer-events-none text-white/50 text-xs">▼</div>
          </div>
        </div>
      </header>

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-[var(--primary)] text-white shadow-xl z-40">
        <div className="px-6 py-6 border-b border-white/10">

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-white/70 font-poppins truncate">{nome}</p>
            {isGestor && (
              <span className="text-[10px] bg-[var(--accent)] text-white px-2 py-0.5 rounded-full font-poppins uppercase tracking-wider font-bold">
                Gestor
              </span>
            )}
          </div>
          {/* Seletor de Fazenda Ativa */}
          <div className="mt-4 bg-white/5 rounded-lg p-2 border border-white/10 relative">
            <label className="text-[10px] uppercase tracking-wider text-white/50 font-poppins block mb-1 px-1">Fazenda Ativa</label>
            <select 
              value={activeFazendaId}
              onChange={(e) => handleFazendaChange(e.target.value)}
              disabled={changingFazenda || fazendas.length === 0}
              className="w-full bg-transparent text-white font-poppins text-sm font-semibold focus:outline-none appearance-none cursor-pointer px-1 py-0.5"
            >
              {fazendas.length === 0 && <option value="">Nenhuma fazenda</option>}
              {fazendas.map(f => (
                <option key={f.id} value={f.id} className="text-black">{f.nome}</option>
              ))}
            </select>
            <div className="absolute right-3 top-[26px] pointer-events-none text-white/50 text-xs">▼</div>
          </div>

      
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-poppins text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white font-poppins text-sm transition-colors disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {loggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </aside>

      {/* Bottom nav — mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--primary)] z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
        <div 
          className="flex items-center px-3 py-2 overflow-x-auto gap-4 [&::-webkit-scrollbar]:hidden" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-1 py-1 rounded-lg transition-colors flex-shrink-0 min-w-[60px] ${
                isActive(item.href) ? 'text-white' : 'text-white/60'
              }`}
            >
              <div className={`flex items-center justify-center w-6 h-6 ${isActive(item.href) ? 'scale-110' : ''} transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-poppins leading-none whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
