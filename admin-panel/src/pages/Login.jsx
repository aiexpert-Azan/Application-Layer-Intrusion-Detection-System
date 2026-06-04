import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (localStorage.getItem('authenticated') === 'true') {
      navigate('/client/1', { replace: true })
    }
  }, [navigate])

  const handleSubmit = (event) => {
    event.preventDefault()

    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('authenticated', 'true')
      navigate('/', { replace: true })
      return
    }

    setError('Invalid username or password.')
  }

  if (localStorage.getItem('authenticated') === 'true') {
    return <Navigate to="/client/1" replace />
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-slate-300 bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex items-center overflow-hidden px-8 py-12 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.04),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.03),transparent_28%)]" />
          <div className="relative max-w-xl">
            <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              SecureIDS Admin Portal
            </div>
            <h1 className="mt-8 font-[var(--font-display)] text-5xl leading-tight tracking-tight text-[var(--text-primary)] md:text-6xl">
              Monitor attacks, block threats, and protect every tenant.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--text-secondary)]">
              Enter the admin console to review blocked traffic, inspect attack patterns, and test the gateway against live or demo clients.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['Live', 'Demo Client streams real backend events'],
                ['Blocked', 'Threats are scored and logged instantly'],
                ['Trusted', 'Simple auth for the local admin console'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl border border-slate-300 bg-white/80 p-4 backdrop-blur">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 lg:px-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-[30px] border border-slate-300 bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          >
            <div>
              <div className="text-sm uppercase tracking-[0.35em] text-[var(--text-secondary)]">Admin Sign In</div>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Use the hardcoded credentials to unlock the dashboard.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-red-400/45 focus:ring-2 focus:ring-red-400/10"
                  placeholder="Enter username"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-red-400/45 focus:ring-2 focus:ring-red-400/10"
                  placeholder="Enter password"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl bg-red-500 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(239,68,68,0.15)] transition hover:bg-red-400"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
