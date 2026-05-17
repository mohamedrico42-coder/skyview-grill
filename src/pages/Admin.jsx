import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from '../context/AuthContext.jsx'
import OrderCard from '../components/admin/OrderCard.jsx'
import MenuItemRow from '../components/admin/MenuItemRow.jsx'
import AddMenuItem from '../components/admin/AddMenuItem.jsx'
import { formatKES, statusLabel, ORDER_STATUSES } from '../utils/format.js'

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'menu', label: 'Menu Management' },
]

const STATUS_FILTERS = ['all', ...ORDER_STATUSES]

export default function Admin() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoadingOrders(false)
      },
      (err) => {
        console.error(err)
        setLoadingOrders(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setMenu(list)
        setLoadingMenu(false)
      },
      (err) => {
        console.error(err)
        setLoadingMenu(false)
      },
    )
    return unsub
  }, [])

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter((o) => o.status === statusFilter)
  }, [orders, statusFilter])

  const stats = useMemo(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let revenueToday = 0
    let openOrders = 0
    orders.forEach((o) => {
      const d = o.createdAt?.toDate?.()
      if (d && d >= start && o.status !== 'done') {
        // open orders today
      }
      if (d && d >= start) {
        revenueToday += Number(o.total) || 0
      }
      if (o.status !== 'done') openOrders += 1
    })
    return { revenueToday, openOrders, totalOrders: orders.length }
  }, [orders])

  const statusCounts = useMemo(() => {
    const counts = { all: orders.length }
    ORDER_STATUSES.forEach((s) => (counts[s] = 0))
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status] += 1
    })
    return counts
  }, [orders])

  return (
    <div className="min-h-screen bg-charcoal">
      <header className="border-b border-charcoal-line bg-charcoal-soft/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-2 ring-gold/60"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-gold/80">
                Sky View · Admin
              </p>
              <p className="heading text-lg leading-tight">Dashboard</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-cream-dim hidden md:inline">{user?.email}</span>
            <button onClick={logout} className="btn-ghost">
              Sign Out
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Revenue Today" value={formatKES(stats.revenueToday)} accent />
            <Stat label="Open Orders" value={stats.openOrders} />
            <Stat label="Total Orders" value={stats.totalOrders} />
          </div>

          <div className="mt-4 flex items-center gap-1 overflow-x-auto rounded-full border border-charcoal-line bg-charcoal-soft p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                  tab === t.key
                    ? 'bg-gold text-charcoal'
                    : 'text-cream/80 hover:text-cream'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {tab === 'orders' ? (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`chip ${statusFilter === s ? 'chip-active' : ''}`}
                >
                  {s === 'all' ? 'All' : statusLabel(s)} · {statusCounts[s] || 0}
                </button>
              ))}
            </div>

            {loadingOrders ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="card p-12 text-center text-cream-dim">
                <p className="heading text-xl text-cream">No orders to show</p>
                <p className="mt-2 text-sm">
                  New orders appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredOrders.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="heading text-2xl">Menu Items</h2>
                <p className="text-sm text-cream-dim">
                  {menu.length} item{menu.length === 1 ? '' : 's'} on the menu
                </p>
              </div>
              <AddMenuItem />
            </div>

            {loadingMenu ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card h-40 animate-pulse" />
                ))}
              </div>
            ) : menu.length === 0 ? (
              <div className="card p-12 text-center text-cream-dim">
                <p className="heading text-xl text-cream">No menu items yet</p>
                <p className="mt-2 text-sm">
                  Click "Add New Item" above to create your first dish.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {menu.map((m) => (
                  <MenuItemRow key={m.id} item={m} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div
      className={`card p-4 ${accent ? 'border-gold/40 bg-gold/5' : ''}`}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-cream-dim">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-2xl ${accent ? 'text-gold' : 'text-cream'}`}
      >
        {value}
      </p>
    </div>
  )
}
