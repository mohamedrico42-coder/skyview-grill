import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config.js'
import {
  ORDER_STATUSES,
  formatKES,
  nextStatus,
  statusLabel,
} from '../../utils/format.js'

const STATUS_STYLES = {
  received: 'bg-flame/15 text-flame border-flame/40',
  preparing: 'bg-gold/15 text-gold border-gold/40',
  ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  done: 'bg-cream/10 text-cream-dim border-cream-dim/30',
}

const formatTime = (ts) => {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

export default function OrderCard({ order }) {
  const updateStatus = async (newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: newStatus })
    } catch (e) {
      console.error('Failed to update status', e)
      alert('Could not update status. Please try again.')
    }
  }

  const next = nextStatus(order.status)
  const shortId = order.id.slice(-6).toUpperCase()

  return (
    <div className="card p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-gold">#{shortId}</p>
          <p className="text-xs text-cream-dim">
            {formatTime(order.createdAt)} · {order.orderType}
            {order.floor ? ` · ${order.floor}` : ''}
            {order.tableNumber ? ` · Table ${order.tableNumber}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[order.status] || ''}`}
        >
          {statusLabel(order.status)}
        </span>
      </header>

      <div>
        <p className="text-sm font-semibold text-cream">{order.customerName}</p>
        <a
          href={`tel:${order.phone}`}
          className="text-xs text-cream-dim hover:text-gold"
        >
          {order.phone}
        </a>
        {order.deliveryAddress && (
          <p className="mt-1 text-xs text-cream-dim">📍 {order.deliveryAddress}</p>
        )}
      </div>

      <ul className="space-y-1 text-sm text-cream/90">
        {(order.items || []).map((it, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {it.quantity}× {it.name}
              {it.variant && (
                <span className="text-cream-dim"> · {it.variant}</span>
              )}
            </span>
            <span className="text-cream-dim">
              {formatKES(it.price * it.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-charcoal-line pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-cream-dim">Total</p>
          <p className="font-display text-xl text-gold">{formatKES(order.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-cream-dim">Payment</p>
          <p className="text-sm capitalize text-cream">
            {order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}
          </p>
          {order.mpesaPhone && (
            <p className="text-xs text-cream-dim">{order.mpesaPhone}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {next && (
          <button
            onClick={() => updateStatus(next)}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            Mark as {statusLabel(next)}
          </button>
        )}
        <div className="ml-auto flex gap-1">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                order.status === s
                  ? 'bg-gold text-charcoal'
                  : 'border border-charcoal-line text-cream-dim hover:border-gold/40 hover:text-cream'
              }`}
              title={`Set status to ${statusLabel(s)}`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
