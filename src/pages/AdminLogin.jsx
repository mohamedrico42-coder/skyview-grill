import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!loading && user) navigate('/admin', { replace: true })
  }, [user, loading, navigate])

  const handle = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      const msg =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err?.code === 'auth/user-not-found'
          ? 'No account found with that email.'
          : 'Sign-in failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-md card p-8">
        <div className="flex flex-col items-center">
          <img
            src="/logo.jpg"
            alt="Sky View Grill"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/60"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <p className="mt-4 text-[10px] uppercase tracking-[0.32em] text-gold/80">
            Staff Portal
          </p>
          <h1 className="heading mt-1 text-2xl">Sign In</h1>
        </div>

        <form onSubmit={handle} className="mt-8 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-flame/40 bg-flame/10 p-3 text-xs text-flame">
              {error}
            </div>
          )}

          <button disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-cream-dim">
          Authorized staff only. Create accounts in the Firebase console.
        </p>
      </div>
    </div>
  )
}
