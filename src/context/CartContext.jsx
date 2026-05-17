import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'skyview_cart_v1'

const cartItemKey = (item) =>
  `${item.id}__${item.variant?.label || 'default'}`

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore quota errors
    }
  }, [items])

  const addItem = (item, variant = null, qty = 1) => {
    const incoming = {
      id: item.id,
      name: item.name,
      price: variant?.price ?? item.price,
      variant: variant ? { label: variant.label, price: variant.price } : null,
      quantity: qty,
      imageUrl: item.imageUrl || null,
    }
    const key = cartItemKey(incoming)
    setItems((curr) => {
      const existing = curr.find((c) => cartItemKey(c) === key)
      if (existing) {
        return curr.map((c) =>
          cartItemKey(c) === key ? { ...c, quantity: c.quantity + qty } : c,
        )
      }
      return [...curr, incoming]
    })
  }

  const removeItem = (key) =>
    setItems((curr) => curr.filter((c) => cartItemKey(c) !== key))

  const updateQty = (key, qty) =>
    setItems((curr) =>
      curr
        .map((c) => (cartItemKey(c) === key ? { ...c, quantity: Math.max(0, qty) } : c))
        .filter((c) => c.quantity > 0),
    )

  const clear = () => setItems([])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const count = items.reduce((sum, i) => sum + i.quantity, 0)
    return { subtotal, count }
  }, [items])

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clear, totals, cartItemKey }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
