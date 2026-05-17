import { Link } from 'react-router-dom'
import { RESTAURANT } from '../utils/format.js'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-charcoal-line bg-charcoal-soft/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3 md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-gold/40"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div>
              <p className="heading text-xl">{RESTAURANT.name}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-gold/80">
                Rooftop · Nairobi
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-cream-dim">
            Premium rooftop dining in Nairobi CBD. Open every day from sunrise to late.
          </p>
        </div>

        <div>
          <p className="label">Visit Us</p>
          <p className="text-sm text-cream/90">{RESTAURANT.location}</p>
          <p className="mt-3 label">Hours</p>
          <p className="text-sm text-cream/90">{RESTAURANT.hours}</p>
        </div>

        <div>
          <p className="label">Order & Contact</p>
          <a
            href={`https://wa.me/${RESTAURANT.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-cream/90 hover:text-gold"
          >
            WhatsApp · {RESTAURANT.phoneDisplay}
          </a>
          <a
            href={`tel:${RESTAURANT.phone}`}
            className="mt-1 block text-sm text-cream/90 hover:text-gold"
          >
            Call · {RESTAURANT.phoneDisplay}
          </a>
          <div className="mt-4 flex gap-3">
            <a
              href={RESTAURANT.instagram}
              target="_blank"
              rel="noreferrer"
              className="chip"
            >
              Instagram · {RESTAURANT.handle}
            </a>
          </div>
          <div className="mt-2 flex gap-3">
            <a
              href={RESTAURANT.tiktok}
              target="_blank"
              rel="noreferrer"
              className="chip"
            >
              TikTok · {RESTAURANT.handle}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-charcoal-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-cream-dim md:flex-row md:items-center md:justify-between md:px-8">
          <p>© {new Date().getFullYear()} Sky View Grill. All rights reserved.</p>
          <Link to="/admin/login" className="hover:text-gold">
            Staff Login
          </Link>
        </div>
      </div>
    </footer>
  )
}
