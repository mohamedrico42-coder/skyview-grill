import { useState } from 'react'
import { formatKES } from '../utils/format.js'
import { useCart } from '../context/CartContext.jsx'

const Placeholder = ({ name }) => (
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-charcoal-soft to-charcoal text-gold/50">
    <div className="text-center">
      <div className="font-display text-3xl">SV</div>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-cream-dim">
        {name?.slice(0, 16) || 'Sky View'}
      </p>
    </div>
  </div>
)

export default function MenuCard({ item }) {
  const { addItem } = useCart()
  const hasVariants = Array.isArray(item.variants) && item.variants.length > 0
  const [variant, setVariant] = useState(hasVariants ? item.variants[0] : null)
  const [added, setAdded] = useState(false)

  const price = variant?.price ?? item.price ?? 0
  const unavailable = item.available === false

  const handleAdd = () => {
    if (unavailable) return
    addItem(item, variant, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="card group flex flex-col overflow-hidden transition hover:border-gold/50">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <Placeholder name={item.name} />
        )}
        {item.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-flame/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal">
            Featured
          </span>
        )}
        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/70 backdrop-blur-sm">
            <span className="rounded-full border border-cream-dim/40 px-4 py-1 text-xs uppercase tracking-widest text-cream-dim">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="heading text-lg leading-tight">{item.name}</h3>
            {item.section && (
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-cream-dim">
                {item.section}
              </p>
            )}
          </div>
          <p className="whitespace-nowrap font-display text-lg text-gold">
            {formatKES(price)}
          </p>
        </div>

        {hasVariants && (
          <div className="flex flex-wrap gap-2">
            {item.variants.map((v) => (
              <button
                key={v.label}
                onClick={() => setVariant(v)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  variant?.label === v.label
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-charcoal-line text-cream-dim hover:border-gold/40 hover:text-cream'
                }`}
              >
                {v.label} · {formatKES(v.price)}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={unavailable}
          className={`mt-auto rounded-full px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
            unavailable
              ? 'cursor-not-allowed border border-charcoal-line text-cream-dim'
              : added
              ? 'bg-flame text-charcoal'
              : 'bg-gold text-charcoal hover:bg-gold-soft'
          }`}
        >
          {unavailable ? 'Unavailable' : added ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
