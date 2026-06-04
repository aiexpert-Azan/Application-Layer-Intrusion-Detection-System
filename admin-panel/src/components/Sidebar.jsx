import { useLocation, useNavigate } from 'react-router-dom'

import { CLIENTS } from '../utils/clients'

export default function Sidebar({ activeClientId = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentClientId = Number(activeClientId)

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-300 bg-[var(--bg-sidebar)]/95 px-4 py-5 text-[var(--text-primary)] shadow-[0_25px_80px_rgba(0,0,0,0.05)] backdrop-blur md:w-[260px] md:min-w-[260px]">
      <div className="mb-6 rounded-3xl border border-slate-300 bg-[var(--bg-card)] px-4 py-4">
        <div className="text-xl font-semibold tracking-wide text-[var(--text-primary)]">🛡️ SecureIDS</div>
        <div className="mt-2 text-sm text-[var(--text-secondary)]">
          Multi-tenant security control room
        </div>
      </div>

      <div className="mb-3 text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">
        Clients
      </div>

      <div className="thin-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {CLIENTS.map((client) => {
          const isActive = Number(client.id) === currentClientId || location.pathname === `/client/${client.id}`

          return (
            <button
              key={client.id}
              type="button"
              onClick={() => navigate(`/client/${client.id}`)}
              className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-200/50 ${
                isActive
                  ? 'border-red-400/40 bg-white shadow-[0_10px_30px_rgba(239,68,68,0.06)]'
                  : 'border-slate-300 bg-white/70'
              }`}
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-lg ring-1 ring-slate-200">
                <span>{client.isLive ? '⚡' : '🗂️'}</span>
                <span
                  className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${
                    client.isLive
                      ? 'animate-pulse bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-[var(--text-primary)]">{client.name}</span>
                  {client.isLive ? (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-red-600">
                      LIVE
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Active
                  </span>
                  <span>•</span>
                  <span>{client.plan}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
      >
        Logout
      </button>
    </aside>
  )
}
