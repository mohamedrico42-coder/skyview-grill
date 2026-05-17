import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import MenuCard from '../components/MenuCard.jsx'
import { useCart } from '../context/CartContext.jsx'

const CATEGORIES = [
  { key: 'food', label: 'Food' },
  { key: 'drinks', label: 'Drinks' },
]

export default function Menu() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('food')
  const [section, setSection] = useState('all')
  const [search, setSearch] = useState('')
  const { totals } = useCart()

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setItems(list)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Failed to load menu. Check your Firebase setup.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    setSection('all')
  }, [category])

  const sections = useMemo(() => {
    const set = new Set()
    items
      .filter((i) => i.category === category)
      .forEach((i) => i.section && set.add(i.section))
    return ['all', ...Array.from(set).sort()]
  }, [items, category])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items
      .filter((i) => i.category === category)
      .filter((i) => section === 'all' || i.section === section)
      .filter((i) =>
        !term
          ? true
          : (i.name || '').toLowerCase().includes(term) ||
            (i.section || '').toLowerCase().includes(term),
      )
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [items, category, section, search])

  return (
    <div className="page-enter mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8 md:pt-12">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-gold/80">Sky View</p>
          <h1 className="heading mt-2 text-3xl md:text-5xl">Our Menu</h1>
          <p className="mt-2 max-w-xl text-sm text-cream-dim">
            Tap any dish to add it to your order. Variants like coffee size or pizza
            size will show a selector.
          </p>
        </div>
        {totals.count > 0 && (
          <Link to="/order" className="btn-primary">
            View cart · {totals.count}
          </Link>
        )}
      </header>

      <div className="sticky top-16 z-30 -mx-4 mt-6 bg-charcoal/85 px-4 py-3 backdrop-blur-md md:top-20 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex-1 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition md:flex-none ${
                  category === c.key
                    ? 'bg-gold text-charcoal shadow-glow'
                    : 'border border-charcoal-line bg-charcoal-soft text-cream/80 hover:border-gold/40'
                }`}
              >
                {c.label}
              </button>
            ))}
            <div className="ml-auto hidden md:block">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="input w-64"
              />
            </div>
          </div>

          <div className="md:hidden">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the menu…"
              className="input"
            />
          </div>

          {sections.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {sections.map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`chip whitespace-nowrap ${
                    section === s ? 'chip-active' : ''
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mt-6">
        {error ? (
          <div className="rounded-2xl border border-flame/40 bg-flame/10 p-6 text-sm text-flame">
            {error}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-[4/3] animate-pulse bg-charcoal-soft" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-charcoal-line" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-charcoal-line" />
                  <div className="h-9 w-full animate-pulse rounded-full bg-charcoal-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal-line p-12 text-center text-cream-dim">
            <p className="heading text-xl text-cream">No items found</p>
            <p className="mt-2 text-sm">Try a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => (
              <MenuCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </section>

      {totals.count > 0 && (
        <Link
          to="/order"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 btn-primary shadow-glow"
        >
          Checkout · {totals.count} item{totals.count > 1 ? 's' : ''}
        </Link>
      )}
    </div>
  )
}
