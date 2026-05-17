import { Link, useSearchParams } from 'react-router-dom'
import { RESTAURANT } from '../utils/format.js'

export default function Confirmation() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const shortId = id ? id.slice(-6).toUpperCase() : '------'

  return (
    <div className="page-enter mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center md:px-8 md:py-24">
      <div className="card relative w-full overflow-hidden p-8 md:p-12">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-flame/15 blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 ring-4 ring-gold/40">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-gold" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.32em] text-gold/80">
            Order Received
          </p>
          <h1 className="heading mt-2 text-3xl md:text-4xl">
            Thank you for ordering!
          </h1>
          <p className="mt-3 text-sm text-cream/85 md:text-base">
            We've received your order and are preparing it now. Estimated time:
            <span className="ml-1 font-semibold text-gold">20–30 minutes</span>.
          </p>

          <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border border-charcoal-line bg-charcoal-soft px-6 py-4">
            <span className="text-[10px] uppercase tracking-[0.22em] text-cream-dim">
              Order Reference
            </span>
            <span className="mt-1 font-display text-2xl text-gold">#{shortId}</span>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={`https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(
                `Hi Sky View Grill, this is about my order #${shortId}.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp"
            >
              Contact us on WhatsApp
            </a>
            <Link to="/menu" className="btn-outline">
              Order Again
            </Link>
          </div>

          <p className="mt-8 text-xs text-cream-dim">
            Questions? Call us at{' '}
            <a href={`tel:${RESTAURANT.phone}`} className="text-gold hover:underline">
              {RESTAURANT.phoneDisplay}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
