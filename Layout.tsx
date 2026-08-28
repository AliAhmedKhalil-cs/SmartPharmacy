import { Link, useLocation } from 'wouter'
import { Search, MessageCircle, Camera, User, ShoppingCart, Home } from 'lucide-react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  cartCount?: number
}

const navItems = [
  { path: '/', icon: Home, label: 'الرئيسية' },
  { path: '/search', icon: Search, label: 'بحث' },
  { path: '/chat', icon: MessageCircle, label: 'دردشة' },
  { path: '/ocr', icon: Camera, label: 'روشتة' },
  { path: '/pharmacies', icon: ShoppingCart, label: 'صيدليات' },
  { path: '/profile', icon: User, label: 'ملفي' },
]

export function Layout({ children, cartCount = 0 }: LayoutProps) {
  const [location] = useLocation()

  return (
    <div className="min-h-dvh pb-20 bg-background">
      {children}
      <nav className="nav-bar">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location === '/' : location.startsWith(path)
          return (
            <Link key={path} href={path}>
              <div className={`nav-item ${isActive ? 'active' : ''}`}>
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {path === '/pharmacies' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
