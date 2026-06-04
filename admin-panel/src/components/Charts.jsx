import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PIE_COLORS = {
  PROMPT_INJECTION: '#ef4444',
  SENSITIVE_INFO: '#f97316',
  OUTPUT_INJECTION: '#eab308',
  CROSS_TENANT_ATTEMPT: '#a855f7',
  INDIRECT_INJECTION: '#ec4899',
}

const PIE_LABELS = {
  PROMPT_INJECTION: 'Prompt Injection',
  SENSITIVE_INFO: 'Sensitive Info',
  OUTPUT_INJECTION: 'Output Injection',
  CROSS_TENANT_ATTEMPT: 'Cross Tenant',
  INDIRECT_INJECTION: 'Indirect Injection',
}

function buildPieData(threatBreakdown = {}) {
  return Object.entries(threatBreakdown)
    .filter(([, count]) => Number(count) > 0)
    .map(([name, count]) => ({
      name,
      label: PIE_LABELS[name] || name,
      value: Number(count) || 0,
      color: PIE_COLORS[name] || '#94a3b8',
    }))
}

function formatDayLabel(day) {
  if (!day) {
    return '--'
  }

  const date = new Date(day)
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
  }

  return day
}

function ChartCard({ title, children, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-300 bg-[var(--bg-card)] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {subtitle ? <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

function LoadingPanel() {
  return <div className="h-[350px] rounded-3xl border border-slate-300 bg-[var(--bg-card)] stat-skeleton" />
}

export default function Charts({ stats, loading = false }) {
  const barData = (stats?.daily_attacks || []).map((entry) => ({
    day: formatDayLabel(entry.day),
    count: Number(entry.count) || 0,
  }))

  const pieData = buildPieData(stats?.threat_breakdown)

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <LoadingPanel />
        <LoadingPanel />
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Attacks Per Day" subtitle="Seven-day activity snapshot">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  color: '#0f172a',
                }}
              />
              <Bar dataKey="count" fill="#ef4444" radius={[12, 12, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Threat Breakdown" subtitle="Distribution of blocked threat classes">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="label"
                innerRadius={70}
                outerRadius={104}
                paddingAngle={4}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  color: '#0f172a',
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span style={{ color: '#0f172a' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
