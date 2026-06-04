import Sidebar from '../components/Sidebar'

export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] md:flex-row">
      <Sidebar />

      <main className="flex flex-1 items-center justify-center p-6 lg:p-10">
        <section className="w-full max-w-3xl rounded-[30px] border border-slate-300 bg-[var(--bg-card)] p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Overview</div>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl tracking-tight text-[var(--text-primary)] md:text-5xl">
            Select a client from sidebar
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Choose a tenant to inspect blocked attacks, live threat feeds, and the security playground.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['4 Clients', 'Preloaded tenants ready for inspection'],
              ['Live Demo', 'Demo Client is connected to the backend'],
              ['Protected', 'Authentication is required to proceed'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-slate-300 bg-slate-50 p-4 text-left">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
