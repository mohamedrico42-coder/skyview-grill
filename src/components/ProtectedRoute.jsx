import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal text-cream-dim">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-charcoal-line border-t-gold" />
          <p className="text-sm">Checking access…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />
  return children
}
