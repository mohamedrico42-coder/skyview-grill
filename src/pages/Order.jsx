import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useCart } from '../context/CartContext.jsx'
import {
  FLOORS,
  RESTAURANT,
  buildWhatsAppOrderText,
  formatKES,
} from '../utils/format.js'

const ORDER_TYPES = [
  { key: 'dine-in', label: 'Dine-In' },
  { key: 'takeaway', label: 'Takeaway' },
  { key: 'delivery', label: 'Delivery' },
]

const PAYMENT_METHODS = [
  { key: 'mpesa', label: 'M-Pesa' },
  { key: 'cash', label: 'Cash on Arrival' },
]

export default function Order() {
  const navigate = useNavigate()
  const { items, removeItem, updateQty, totals, clear, cartItemKey } = useCart()

  const [orderType, setOrderType] = useState('dine-in')
  const [tableNumber, setTableNumber] = useState('')
  const [floor, setFloor] = useState(FLOORS[0])
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // M-Pesa STK push waiting state
  const [mpesaState, setMpesaState] = useState(null) // null | { orderId, message, status }
  const mpesaUnsubRef = useRef(null)
  const mpesaTimeoutRef = useRef(null)

  useEffect(() => () => {
    if (mpesaUnsubRef.current) mpesaUnsubRef.current()
    if (mpesaTimeoutRef.current) clearTimeout(mpesaTimeoutRef.current)
  }, [])

  const validation = useMemo(() => {
    if (items.length === 0) return 'Your cart is empty.'
    if (!customerName.trim()) return 'Please enter your name.'
    if (!phone.trim()) return 'Please enter a phone number.'
    if (orderType === 'dine-in' && !tableNumber.trim())
      return 'Please enter your table number.'
    if (orderType === 'delivery' && !deliveryAddress.trim())
      return 'Please enter a delivery address.'
    if (paymentMethod === 'mpesa' && !mpesaPhone.trim())
      return 'Please enter the M-Pesa phone number.'
    return null
  }, [items, customerName, phone, orderType, tableNumber, deliveryAddress, paymentMethod, mpesaPhone])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setError(null)
    if (validation) {
      setError(validation)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        items: items.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant?.label || null,
        })),
        customerName: customerName.trim(),
        phone: phone.trim(),
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber.trim() : null,
        floor: orderType === 'dine-in' ? floor : null,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : null,
        total: totals.subtotal,
        paymentMethod,
        mpesaPhone: paymentMethod === 'mpesa' ? mpesaPhone.trim() : null,
        paymentStatus: 'pending',
        status: 'received',
        createdAt: serverTimestamp(),
      }
      const ref = await addDoc(collection(db, 'orders'), payload)

      if (paymentMethod === 'mpesa') {
        await startMpesaFlow(ref.id)
      } else {
        clear()
        navigate(`/confirmation?id=${ref.id}`, { replace: true })
      }
    } catch (err) {
      console.error(err)
      setError('Could not submit order. Please try again or use WhatsApp.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelMpesaWait = () => {
    if (mpesaUnsubRef.current) { mpesaUnsubRef.current(); mpesaUnsubRef.current = null }
    if (mpesaTimeoutRef.current) { clearTimeout(mpesaTimeoutRef.current); mpesaTimeoutRef.current = null }
    setMpesaState(null)
  }

  const startMpesaFlow = async (orderId) => {
    setMpesaState({ orderId, status: 'sending', message: 'Sending payment request to your phone…' })
    try {
      const resp = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: mpesaPhone.trim(),
          amount: totals.subtotal,
          orderId,
          description: `Order ${orderId.slice(-6).toUpperCase()}`,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setMpesaState({
          orderId,
          status: 'failed',
          message: data.error || 'Could not start M-Pesa payment.',
        })
        return
      }

      setMpesaState({
        orderId,
        status: 'waiting',
        message: data.message || 'Check your phone and enter your M-Pesa PIN.',
      })

      // Listen for callback to mark this order paid/failed
      const orderRef = doc(db, 'orders', orderId)
      mpesaUnsubRef.current = onSnapshot(orderRef, (snap) => {
        const d = snap.data()
        if (!d) return
        if (d.paymentStatus === 'paid') {
          cancelMpesaWait()
          clear()
          navigate(`/confirmation?id=${orderId}`, { replace: true })
        } else if (d.paymentStatus === 'failed') {
          setMpesaState({
            orderId,
            status: 'failed',
            message: d.mpesaResultDesc || 'Payment was cancelled or failed.',
          })
        }
      })

      // 90s timeout — Daraja STK prompt expires around then
      mpesaTimeoutRef.current = setTimeout(() => {
        setMpesaState((s) =>
          s && s.status === 'waiting'
            ? {
                ...s,
                status: 'timeout',
                message:
                  'No response yet. The prompt may have expired — try again, or use a different payment method.',
              }
            : s,
        )
      }, 90_000)
    } catch (err) {
      console.error(err)
      setMpesaState({
        orderId,
        status: 'failed',
        message: 'Could not reach M-Pesa. Please try again.',
      })
    }
  }

  const whatsappUrl = useMemo(() => {
    const text = buildWhatsAppOrderText(items, totals)
    return `https://wa.me/${RESTAURANT.whatsapp}?text=${text}`
  }, [items, totals])

  if (items.length === 0) {
    return (
      <div className="page-enter mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center md:px-8">
        <div className="card flex flex-col items-center gap-4 p-10">
          <div className="text-5xl">🛒</div>
          <h1 className="heading text-3xl">Your cart is empty</h1>
          <p className="text-sm text-cream-dim">
            Add a few dishes from the menu to start your order.
          </p>
          <Link to="/menu" className="btn-primary mt-2">
            Browse Menu
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto max-w-6xl px-4 py-10 md:px-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.32em] text-gold/80">Checkout</p>
        <h1 className="heading mt-2 text-3xl md:text-5xl">Your Order</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Cart + form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="card divide-y divide-charcoal-line">
            <div className="p-5">
              <h2 className="heading text-xl">Items</h2>
            </div>
            {items.map((i) => {
              const key = cartItemKey(i)
              return (
                <div key={key} className="flex items-center gap-4 p-5">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-charcoal-line">
                    {i.imageUrl ? (
                      <img
                        src={i.imageUrl}
                        alt={i.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-gold/60">
                        SV
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-cream">{i.name}</p>
                    {i.variant && (
                      <p className="text-xs text-cream-dim">{i.variant.label}</p>
                    )}
                    <p className="mt-1 text-sm text-gold">{formatKES(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-charcoal-line bg-charcoal-soft px-2 py-1">
                    <button
                      type="button"
                      onClick={() => updateQty(key, i.quantity - 1)}
                      className="h-7 w-7 rounded-full text-gold hover:bg-charcoal-line"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {i.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(key, i.quantity + 1)}
                      className="h-7 w-7 rounded-full text-gold hover:bg-charcoal-line"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(key)}
                    className="text-xs uppercase tracking-wider text-cream-dim hover:text-flame"
                    aria-label={`Remove ${i.name}`}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </section>

          <section className="card p-5 space-y-5">
            <h2 className="heading text-xl">Order Type</h2>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOrderType(o.key)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                    orderType === o.key
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-charcoal-line bg-charcoal-soft text-cream/80 hover:border-gold/40'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {orderType === 'dine-in' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Table Number</label>
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 12"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Floor</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FLOORS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFloor(f)}
                        className={`rounded-xl border px-3 py-3 text-sm transition ${
                          floor === f
                            ? 'border-gold bg-gold/15 text-gold'
                            : 'border-charcoal-line bg-charcoal-soft text-cream/80'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {orderType === 'delivery' && (
              <div>
                <label className="label">Delivery Address</label>
                <textarea
                  rows={3}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Building, street, landmark"
                  className="input resize-none"
                />
              </div>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="heading text-xl">Your Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  inputMode="tel"
                  className="input"
                />
              </div>
            </div>
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="heading text-xl">Payment</h2>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPaymentMethod(p.key)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                    paymentMethod === p.key
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-charcoal-line bg-charcoal-soft text-cream/80 hover:border-gold/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'mpesa' && (
              <div>
                <label className="label">M-Pesa Phone (Safaricom)</label>
                <input
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  inputMode="tel"
                  pattern="[0-9+ ]*"
                  className="input"
                />
                <p className="mt-2 text-xs text-cream-dim">
                  Enter the Safaricom number that will receive the M-Pesa PIN
                  prompt — accepts 07XXXXXXXX or 2547XXXXXXXX.
                </p>
              </div>
            )}
          </section>
        </form>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6 space-y-5">
            <h2 className="heading text-xl">Summary</h2>
            <div className="space-y-2 text-sm">
              {items.map((i) => {
                const key = cartItemKey(i)
                return (
                  <div key={key} className="flex justify-between text-cream/85">
                    <span>
                      {i.quantity}× {i.name}
                      {i.variant && (
                        <span className="text-cream-dim"> · {i.variant.label}</span>
                      )}
                    </span>
                    <span>{formatKES(i.price * i.quantity)}</span>
                  </div>
                )
              })}
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider text-cream-dim">Total</span>
              <span className="font-display text-2xl text-gold">
                {formatKES(totals.subtotal)}
              </span>
            </div>

            {error && (
              <div className="rounded-xl border border-flame/40 bg-flame/10 p-3 text-xs text-flame">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !!validation}
              className="btn-primary w-full"
            >
              {submitting
                ? paymentMethod === 'mpesa'
                  ? 'Starting M-Pesa…'
                  : 'Placing order…'
                : paymentMethod === 'mpesa'
                ? `Pay ${formatKES(totals.subtotal)} with M-Pesa`
                : 'Place Order'}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp w-full"
            >
              Order via WhatsApp
            </a>

            <p className="text-center text-[11px] text-cream-dim">
              By placing your order you agree to be contacted on the phone you provide.
            </p>
          </div>
        </aside>
      </div>

      {mpesaState && (
        <MpesaWaitingModal
          state={mpesaState}
          onClose={cancelMpesaWait}
          onRetry={() => mpesaState.orderId && startMpesaFlow(mpesaState.orderId)}
        />
      )}
    </div>
  )
}

function MpesaWaitingModal({ state, onClose, onRetry }) {
  const { status, message } = state
  const isWaiting = status === 'sending' || status === 'waiting'
  const isFailed = status === 'failed' || status === 'timeout'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/95 px-4 backdrop-blur-md animate-fade-in">
      <div className="card relative w-full max-w-md p-8 text-center">
        {isWaiting && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 ring-4 ring-gold/30">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-charcoal-line border-t-gold" />
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.32em] text-gold/80">
              M-Pesa Payment
            </p>
            <h2 className="heading mt-2 text-2xl">
              {status === 'sending' ? 'Sending request…' : 'Check your phone'}
            </h2>
            <p className="mt-3 text-sm text-cream/85">{message}</p>
            <p className="mt-4 text-xs text-cream-dim">
              You'll see a Safaricom STK prompt — enter your PIN to confirm payment.
            </p>
            <button onClick={onClose} className="btn-ghost mt-6 mx-auto">
              Cancel
            </button>
          </>
        )}

        {isFailed && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-flame/15 ring-4 ring-flame/30 text-flame text-3xl">
              ✕
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.32em] text-flame">
              Payment {status === 'timeout' ? 'timed out' : 'failed'}
            </p>
            <h2 className="heading mt-2 text-2xl">Try again?</h2>
            <p className="mt-3 text-sm text-cream/85">{message}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button onClick={onRetry} className="btn-primary">
                Retry M-Pesa
              </button>
              <button onClick={onClose} className="btn-ghost">
                Close
              </button>
            </div>
            <p className="mt-4 text-[11px] text-cream-dim">
              Your order is saved as pending — staff can still see it.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
