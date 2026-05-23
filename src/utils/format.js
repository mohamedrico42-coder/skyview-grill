export const formatKES = (n) => {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'KES 0'
  return `KES ${n.toLocaleString('en-KE')}`
}

export const RESTAURANT = {
  name: 'Sky View Grill',
  tagline: 'Rooftop dining above the city',
  location: 'Simara Mall, Tom Mboya Street, Nairobi',
  floors: 'First Floor & Rooftop',
  phoneDisplay: '0119 619 263',
  phone: '0119619263',
  whatsapp: '254119619263',
  hours: 'Open every day · 7:00 AM to 10:00 PM',
  hoursShort: '7 AM – 10 PM',
  instagram: 'https://instagram.com/SkyViewGrill',
  tiktok: 'https://tiktok.com/@SkyViewGrill',
  handle: '@SkyViewGrill',
}

export const FLOORS = ['Rooftop', 'First Floor']

export const ORDER_STATUSES = ['received', 'preparing', 'ready', 'done']

export const nextStatus = (s) => {
  const i = ORDER_STATUSES.indexOf(s)
  if (i < 0 || i === ORDER_STATUSES.length - 1) return null
  return ORDER_STATUSES[i + 1]
}

export const statusLabel = (s) =>
  ({ received: 'Received', preparing: 'Preparing', ready: 'Ready', done: 'Done' }[s] || s)

export const buildWhatsAppOrderText = (items, totals) => {
  const lines = ['*New order — Sky View Grill*', '']
  items.forEach((i) => {
    const variant = i.variant ? ` (${i.variant.label})` : ''
    lines.push(`• ${i.quantity}× ${i.name}${variant} — KES ${(i.price * i.quantity).toLocaleString('en-KE')}`)
  })
  lines.push('')
  lines.push(`*Total: KES ${totals.subtotal.toLocaleString('en-KE')}*`)
  return encodeURIComponent(lines.join('\n'))
}
