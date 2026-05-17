import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

const links = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/order', label: 'Order' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { totals } = useCart()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all ${
        scrolled
          ? 'bg-charcoal/85 backdrop-blur-md border-b border-charcoal-line'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-20 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Sky View Grill"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-gold/60 md:h-12 md:w-12"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-cream md:text-lg">
              Sky View Grill
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80 md:text-[11px]">
              Rooftop · Nairobi
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium tracking-wide transition ${
                  isActive ? 'text-gold' : 'text-cream/80 hover:text-cream'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/order" className="btn-primary">
            Cart
            {totals.count > 0 && (
              <span className="ml-1 rounded-full bg-charcoal px-2 py-0.5 text-xs text-gold">
                {totals.count}
              </span>
            )}
          </Link>
        </div>

        <button
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden relative h-10 w-10 rounded-full border border-charcoal-line bg-charcoal-soft text-cream"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            {open ? '✕' : '☰'}
          </span>
          {totals.count > 0 && !open && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-charcoal">
              {totals.count}
            </span>
          )}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-charcoal-line bg-charcoal/95 backdrop-blur-md animate-fade-in">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-gold/10 text-gold'
                      : 'text-cream/80 hover:bg-charcoal-soft'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/order" className="btn-primary mt-2">
              View cart {totals.count > 0 && `· ${totals.count}`}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
