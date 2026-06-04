function StatCard({ title, value, icon, accent, ring, subtitle }) {
  return (
    <div className={`rounded-3xl border border-slate-300 bg-[var(--bg-card)] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ${ring}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[var(--text-secondary)]">{title}</div>
          <div className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>{value}</div>
          {subtitle ? <div className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</div> : null}
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function LoadingCard() {
  return <div className="h-[132px] rounded-3xl border border-slate-300 bg-[var(--bg-card)] stat-skeleton" />
}

export default function StatsCards({ stats, loading = false }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </div>
    )
  }

  const threatTypes = Object.keys(stats?.threat_breakdown || {}).length

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total Attacks"
        value={stats?.total_attacks ?? 0}
        icon="⛔"
        accent="text-red-400"
        ring="ring-red-400/15"
      />
      <StatCard
        title="Blocked Today"
        value={stats?.blocked_count ?? 0}
        icon="🛑"
        accent="text-orange-400"
        ring="ring-orange-400/15"
      />
      <StatCard
        title="Threat Types"
        value={threatTypes}
        icon="⚠️"
        accent="text-yellow-400"
        ring="ring-yellow-400/15"
      />
      <StatCard
        title="Status"
        value="Protected"
        subtitle="Gateway is monitoring traffic"
        icon="🟢"
        accent="text-emerald-400"
        ring="ring-emerald-400/15"
      />
    </div>
  )
}
