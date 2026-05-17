import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import MenuCard from '../components/MenuCard.jsx'
import { RESTAURANT } from '../utils/format.js'

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const q = query(
          collection(db, 'menu'),
          where('featured', '==', true),
          limit(4),
        )
        const snap = await getDocs(q)
        let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        if (docs.length < 4) {
          const all = await getDocs(query(collection(db, 'menu'), limit(8)))
          const ids = new Set(docs.map((d) => d.id))
          all.docs.forEach((d) => {
            if (docs.length >= 4) return
            if (!ids.has(d.id)) docs.push({ id: d.id, ...d.data() })
          })
        }
        if (active) setFeatured(docs.slice(0, 4))
      } catch (e) {
        console.error('Failed to load featured', e)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page-enter">
      <Hero />
      <Promo />
      <Featured items={featured} loading={loading} />
      <InfoBlock />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative -mt-16 flex min-h-[100svh] items-center justify-center overflow-hidden md:-mt-20">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal-soft to-charcoal" />
        <div className="absolute inset-0 gradient-radial-gold opacity-90" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(rgba(212,160,23,0.18) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-charcoal" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-16 text-center md:pt-32">
        <img
          src="/logo.jpg"
          alt="Sky View Grill"
          className="mb-6 h-24 w-24 rounded-full object-cover ring-4 ring-gold/60 shadow-glow md:h-32 md:w-32"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <p className="mb-3 text-xs uppercase tracking-[0.32em] text-gold/90 md:text-sm">
          Nairobi · Tom Mboya Street
        </p>
        <h1 className="heading text-shadow-strong text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
          Dining <span className="text-gold">above</span> the city
        </h1>
        <p className="mt-5 max-w-xl text-base text-cream/85 md:text-lg">
          Flame-grilled flavours, hand-tossed pizza and curated drinks served on
          Nairobi's most welcoming rooftop. Open daily from sunrise to late.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link to="/menu" className="btn-primary">
            Order Now
          </Link>
          <a
            href={`https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(
              'Hi Sky View Grill, I would like to place an order.',
            )}`}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp"
          >
            WhatsApp Us
          </a>
        </div>

        <div className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoPill label="Location" value={RESTAURANT.location} />
          <InfoPill label="Hours" value="6 AM – 10:30 PM" />
          <InfoPill label="Call" value={RESTAURANT.phoneDisplay} />
        </div>
      </div>
    </section>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="card flex flex-col items-start gap-1 px-4 py-3 text-left">
      <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
        {label}
      </span>
      <span className="text-sm text-cream/90">{value}</span>
    </div>
  )
}

function Promo() {
  return (
    <section className="mx-auto max-w-6xl px-4 -mt-8 md:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-flame/20 via-charcoal-soft to-charcoal p-6 md:p-10">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-flame/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-flame">
              Pizza Promo
            </p>
            <h2 className="heading mt-2 text-2xl md:text-4xl">
              Buy 1 Get 1 <span className="text-gold">Free</span>
            </h2>
            <p className="mt-2 text-sm text-cream/85 md:text-base">
              Every Wednesday, Saturday & Sunday — on any large pizza.
            </p>
          </div>
          <Link
            to="/menu"
            className="btn-outline border-flame text-flame hover:bg-flame hover:text-charcoal"
          >
            See Pizzas
          </Link>
        </div>
      </div>
    </section>
  )
}

function Featured({ items, loading }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-gold/80">
            On the menu
          </p>
          <h2 className="heading mt-2 text-3xl md:text-4xl">Tonight's favourites</h2>
        </div>
        <Link to="/menu" className="text-sm font-semibold uppercase tracking-wider text-gold hover:text-gold-soft">
          View full menu →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-[4/3] w-full animate-pulse bg-charcoal-soft" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-charcoal-line" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-charcoal-line" />
                  <div className="h-9 w-full animate-pulse rounded-full bg-charcoal-line" />
                </div>
              </div>
            ))
          : items.length > 0
          ? items.map((it) => <MenuCard key={it.id} item={it} />)
          : (
              <div className="col-span-full rounded-2xl border border-dashed border-charcoal-line p-10 text-center text-cream-dim">
                Menu loading soon — the admin can add featured items from the dashboard.
              </div>
            )}
      </div>
    </section>
  )
}

function InfoBlock() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
      <div className="card grid gap-8 p-6 md:grid-cols-3 md:p-10">
        <div>
          <p className="label">Find Us</p>
          <p className="heading text-xl">Simara Mall</p>
          <p className="mt-1 text-sm text-cream/85">
            Tom Mboya Street, Nairobi CBD
          </p>
        </div>
        <div>
          <p className="label">Opening Hours</p>
          <p className="heading text-xl">Every Day</p>
          <p className="mt-1 text-sm text-cream/85">
            6:00 AM – 10:30 PM
          </p>
        </div>
        <div>
          <p className="label">Reservations & Orders</p>
          <p className="heading text-xl">{RESTAURANT.phoneDisplay}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${RESTAURANT.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="chip chip-active"
            >
              WhatsApp
            </a>
            <a href={`tel:${RESTAURANT.phone}`} className="chip">
              Call
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
