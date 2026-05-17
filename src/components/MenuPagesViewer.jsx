import { useCallback, useEffect, useState } from 'react'

export default function MenuPagesViewer({ category, manifest }) {
  const block = manifest?.[category]
  const pages = block?.pages || []
  const label = block?.label || category

  const [openIndex, setOpenIndex] = useState(null)
  const open = openIndex !== null

  const close = useCallback(() => setOpenIndex(null), [])
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + pages.length) % pages.length)),
    [pages.length],
  )
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % pages.length)),
    [pages.length],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, prev, next])

  if (pages.length === 0) return null

  return (
    <>
      {/* Category hero banner */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-charcoal-line">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="group block w-full text-left"
          aria-label={`Open ${label} menu`}
        >
          <div className="relative aspect-[16/7] w-full bg-charcoal-soft md:aspect-[16/5]">
            <img
              src={pages[0]}
              alt={`${label} menu cover`}
              className="h-full w-full object-cover opacity-95 transition duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
              <p className="text-[10px] uppercase tracking-[0.32em] text-gold/90">
                Our printed menu · {pages.length} pages
              </p>
              <h2 className="heading mt-1 text-2xl md:text-4xl text-shadow-strong">
                Browse the {label} menu
              </h2>
              <p className="mt-2 max-w-md text-sm text-cream/85">
                Tap any page to view full size. Order anything you see using the cards below.
              </p>
            </div>
            <div className="absolute right-4 top-4 rounded-full border border-cream/30 bg-charcoal/60 px-3 py-1 text-[10px] uppercase tracking-widest text-cream backdrop-blur">
              View full size
            </div>
          </div>
        </button>
      </section>

      {/* Thumbnail strip */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-cream-dim">
            All {label} pages
          </p>
          <span className="text-xs text-cream-dim">{pages.length}</span>
        </div>
        <div className="no-scrollbar -mx-2 flex gap-3 overflow-x-auto px-2 pb-2">
          {pages.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative flex-shrink-0 overflow-hidden rounded-xl border border-charcoal-line bg-charcoal-soft transition hover:border-gold/60 hover:shadow-glow"
              aria-label={`Open ${label} page ${i + 1}`}
            >
              <img
                src={src}
                alt={`${label} page ${i + 1}`}
                loading="lazy"
                className="h-32 w-24 object-cover transition duration-500 group-hover:scale-[1.05] md:h-40 md:w-28"
              />
              <span className="absolute bottom-1 right-1 rounded-md bg-charcoal/80 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/95 p-4 backdrop-blur-md animate-fade-in"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-cream/30 bg-charcoal-soft text-cream hover:bg-charcoal-line"
            aria-label="Close"
          >
            ✕
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-cream/30 bg-charcoal-soft text-2xl text-cream hover:bg-charcoal-line md:left-8"
            aria-label="Previous page"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-cream/30 bg-charcoal-soft text-2xl text-cream hover:bg-charcoal-line md:right-8"
            aria-label="Next page"
          >
            ›
          </button>

          <div
            className="relative max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={pages[openIndex]}
              alt={`${label} page ${openIndex + 1}`}
              className="mx-auto max-h-[88vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <div className="mt-3 text-center text-xs uppercase tracking-[0.22em] text-cream-dim">
              {label} · Page {openIndex + 1} / {pages.length}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
