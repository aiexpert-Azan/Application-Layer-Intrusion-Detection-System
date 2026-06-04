const THREAT_STYLES = {
  PROMPT_INJECTION: {
    row: 'bg-red-50/40',
    badge: 'border-red-200 bg-red-50 text-red-700',
    bar: 'bg-red-500',
  },
  SENSITIVE_INFO: {
    row: 'bg-orange-50/40',
    badge: 'border-orange-200 bg-orange-50 text-orange-700',
    bar: 'bg-orange-500',
  },
  OUTPUT_INJECTION: {
    row: 'bg-yellow-50/40',
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    bar: 'bg-yellow-500',
  },
  CROSS_TENANT_ATTEMPT: {
    row: 'bg-purple-50/40',
    badge: 'border-purple-200 bg-purple-50 text-purple-700',
    bar: 'bg-purple-500',
  },
  INDIRECT_INJECTION: {
    row: 'bg-pink-50/40',
    badge: 'border-pink-200 bg-pink-50 text-pink-700',
    bar: 'bg-pink-500',
  },
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp || '--'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

function formatQuery(query) {
  if (!query) {
    return '--'
  }

  return query.length > 40 ? `${query.slice(0, 40)}...` : query
}

function getThreatStyles(threatType) {
  return THREAT_STYLES[threatType] || {
    row: 'bg-transparent',
    badge: 'border-[var(--border)] bg-slate-100 text-[var(--text-primary)]',
    bar: 'bg-slate-400',
  }
}

export default function ThreatTable({ logs = [], loading = false }) {
  const sortedLogs = [...logs].sort((left, right) => {
    const leftTime = new Date(left.timestamp || 0).getTime()
    const rightTime = new Date(right.timestamp || 0).getTime()
    return rightTime - leftTime
  })

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-300 bg-[var(--bg-card)] p-5">
        <div className="h-6 w-48 stat-skeleton rounded-lg" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 rounded-2xl stat-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-300 bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between border-b border-slate-300 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Threat Feed</h3>
          <p className="text-sm text-[var(--text-secondary)]">Latest blocked events are shown first.</p>
        </div>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center px-6 py-10 text-center text-[var(--text-secondary)]">
          No attacks detected — System Protected ✅
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-4 font-medium">Time</th>
                <th className="px-5 py-4 font-medium">Threat Type</th>
                <th className="px-5 py-4 font-medium">Query</th>
                <th className="px-5 py-4 font-medium">Action</th>
                <th className="px-5 py-4 font-medium">Confidence</th>
              </tr>
            </thead>

            <tbody>
              {sortedLogs.map((log, index) => {
                const threatType = log.threat_type || 'UNKNOWN'
                const styles = getThreatStyles(threatType)
                const confidence = Math.max(0, Math.min(100, Math.round(Number(log.confidence) || 0)))

                return (
                  <tr key={log.id || `${log.timestamp}-${index}`} className={`border-t border-slate-300 ${styles.row}`}>
                    <td className="px-5 py-4 text-sm text-[var(--text-primary)]">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] ${styles.badge}`}>
                        {threatType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{formatQuery(log.query)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-red-600">
                      {String(log.action || 'BLOCKED').toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-sm text-[var(--text-primary)]">{confidence}%</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${styles.bar}`}
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
