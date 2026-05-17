import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../../firebase/config.js'

const empty = {
  name: '',
  price: '',
  category: 'food',
  section: '',
  available: true,
  featured: false,
  variantsRaw: '',
}

export default function AddMenuItem() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required.')
      return
    }
    let variants = []
    if (form.variantsRaw.trim()) {
      try {
        variants = form.variantsRaw
          .split(',')
          .map((piece) => {
            const [label, price] = piece.split(':').map((s) => s.trim())
            if (!label || !price) throw new Error('bad variant')
            return { label, price: Number(price) }
          })
          .filter((v) => v.label && !Number.isNaN(v.price))
      } catch {
        setError('Variants must look like: Single:200, Double:350')
        return
      }
    }

    setSaving(true)
    try {
      await addDoc(collection(db, 'menu'), {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        category: form.category,
        section: form.section.trim(),
        available: !!form.available,
        featured: !!form.featured,
        variants,
        imageUrl: null,
      })
      setForm(empty)
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Failed to add item.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Add New Item
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-lg">New Menu Item</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setForm(empty)
            setError(null)
          }}
          className="text-xs uppercase tracking-wider text-cream-dim hover:text-flame"
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Margherita Pizza"
          />
        </div>
        <div>
          <label className="label">Price (KES)</label>
          <input
            className="input"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0"
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="food">Food</option>
            <option value="drinks">Drinks</option>
          </select>
        </div>
        <div>
          <label className="label">Section</label>
          <input
            className="input"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="e.g. Pizza, Coffee, Burgers"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Variants (optional)</label>
          <input
            className="input"
            value={form.variantsRaw}
            onChange={(e) => setForm({ ...form, variantsRaw: e.target.value })}
            placeholder="Single:200, Double:350"
          />
          <p className="mt-1 text-xs text-cream-dim">
            Format: <code>Label:Price, Label:Price</code>. Leave empty if none.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm({ ...form, available: e.target.checked })}
          />
          Available
        </label>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Featured
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-flame/40 bg-flame/10 p-3 text-xs text-flame">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Item'}
        </button>
        <p className="text-xs text-cream-dim">
          You can upload a photo after creating the item.
        </p>
      </div>
    </form>
  )
}
