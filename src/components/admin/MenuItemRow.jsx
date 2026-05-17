import { useState } from 'react'
import {
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage'
import { db, storage } from '../../firebase/config.js'
import { formatKES } from '../../utils/format.js'

export default function MenuItemRow({ item }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: item.name || '',
    price: item.price || 0,
    section: item.section || '',
    category: item.category || 'food',
    available: item.available !== false,
    featured: !!item.featured,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateDoc(doc(db, 'menu', item.id), {
        name: draft.name.trim(),
        price: Number(draft.price) || 0,
        section: draft.section.trim(),
        category: draft.category,
        available: !!draft.available,
        featured: !!draft.featured,
      })
      setEditing(false)
    } catch (e) {
      console.error(e)
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async () => {
    try {
      await updateDoc(doc(db, 'menu', item.id), {
        available: item.available === false,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'menu', item.id))
    } catch (e) {
      console.error(e)
      alert('Could not delete this item.')
    }
  }

  const upload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    setProgress(0)
    const path = `menu/${item.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const r = storageRef(storage, path)
    const task = uploadBytesResumable(r, file, { contentType: file.type })
    task.on(
      'state_changed',
      (snap) => {
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
      },
      (err) => {
        console.error(err)
        setError('Upload failed.')
        setUploading(false)
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          await updateDoc(doc(db, 'menu', item.id), { imageUrl: url })
        } catch (err) {
          console.error(err)
          setError('Failed to save image URL.')
        } finally {
          setUploading(false)
        }
      },
    )
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-charcoal-line">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-gold/50">
              SV
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Item name"
              />
              <input
                className="input"
                type="number"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="Price (KES)"
              />
              <input
                className="input"
                value={draft.section}
                onChange={(e) => setDraft({ ...draft, section: e.target.value })}
                placeholder="Section (e.g. Pizza)"
              />
              <select
                className="input"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                <option value="food">Food</option>
                <option value="drinks">Drinks</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-cream/80">
                <input
                  type="checkbox"
                  checked={draft.available}
                  onChange={(e) =>
                    setDraft({ ...draft, available: e.target.checked })
                  }
                />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm text-cream/80">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) =>
                    setDraft({ ...draft, featured: e.target.checked })
                  }
                />
                Featured
              </label>
            </div>
          ) : (
            <>
              <p className="truncate font-semibold text-cream">{item.name}</p>
              <p className="text-xs text-cream-dim">
                {item.category} · {item.section || 'No section'}
              </p>
              <p className="mt-1 font-display text-gold">{formatKES(item.price)}</p>
              {item.variants?.length > 0 && (
                <p className="mt-1 text-xs text-cream-dim">
                  Variants: {item.variants.map((v) => v.label).join(', ')}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {item.available === false && (
                  <span className="rounded-full border border-flame/40 bg-flame/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-flame">
                    Sold Out
                  </span>
                )}
                {item.featured && (
                  <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                    Featured
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal-line">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-cream-dim">Uploading… {progress}%</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-flame/40 bg-flame/10 px-3 py-2 text-xs text-flame">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button onClick={save} disabled={saving} className="btn-primary !px-4 !py-2 text-xs">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs">
              Edit
            </button>
            <label className="btn-ghost cursor-pointer text-xs">
              {item.imageUrl ? 'Replace Photo' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={upload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <button
              onClick={toggleAvailable}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                item.available === false
                  ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-flame/40 text-flame hover:bg-flame/10'
              }`}
            >
              {item.available === false ? 'Mark Available' : 'Mark Sold Out'}
            </button>
            <button
              onClick={remove}
              className="ml-auto rounded-full border border-flame/40 px-3 py-1.5 text-xs font-medium text-flame hover:bg-flame/10"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
