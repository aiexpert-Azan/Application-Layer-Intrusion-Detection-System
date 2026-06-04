import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import Charts from '../components/Charts'
import Sidebar from '../components/Sidebar'
import StatsCards from '../components/StatsCards'
import ThreatTable from '../components/ThreatTable'
import useWebSocket from '../hooks/useWebSocket'
import { fetchLogs, fetchStats } from '../utils/api'
import { getClientById, getDummyClientData } from '../utils/clients'

function normalizeLiveLog(message) {
  return {
    id: `${message.timestamp || Date.now()}-${message.threat_type || 'event'}`,
    timestamp: message.timestamp,
    threat_type: message.threat_type,
    query: message.query,
    action: message.action || 'BLOCKED',
    confidence: Number(message.confidence) || 0,
    client_name: message.client_name,
  }
}

function updateStatsFromMessage(previousStats, message) {
  if (!previousStats) {
    return previousStats
  }

  const threatType = message.threat_type || 'UNKNOWN'
  const dayKey = new Date(message.timestamp || Date.now()).toISOString().slice(0, 10)
  const breakdown = {
    ...(previousStats.threat_breakdown || {}),
    [threatType]: (previousStats.threat_breakdown?.[threatType] || 0) + 1,
  }

  const dailyMap = new Map((previousStats.daily_attacks || []).map((entry) => [entry.day, Number(entry.count) || 0]))
  dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1)

  return {
    ...previousStats,
    total_attacks: (Number(previousStats.total_attacks) || 0) + 1,
    blocked_count: (Number(previousStats.blocked_count) || 0) + 1,
    threat_breakdown: breakdown,
    daily_attacks: Array.from(dailyMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day)),
  }
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const clientId = Number(id)
  const client = getClientById(clientId)
  const isLiveClient = Boolean(client?.isLive)
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(Boolean(client))
  const [error, setError] = useState('')
  const processedMessageCount = useRef(0)
  const { messages: liveMessages, connected } = useWebSocket(isLiveClient ? clientId : null)

  useEffect(() => {
    if (!client) {
      setStats(null)
      setLogs([])
      setLoading(false)
      return undefined
    }

    if (!isLiveClient) {
      const dummy = getDummyClientData(clientId)
      setStats(dummy.stats)
      setLogs(dummy.logs)
      setError('')
      setLoading(false)
      return undefined
    }

    let cancelled = false

    async function loadLiveData() {
      setLoading(true)
      setError('')
      const fallback = getDummyClientData(clientId)

      try {
        const statsResponse = await fetchStats(clientId, client.api_key)
        if (!cancelled) {
          setStats(statsResponse.stats || statsResponse)
        }
      } catch (requestError) {
        console.log("Stats fetch failed:", requestError)
        if (!cancelled) {
          setStats(fallback.stats)
        }
      }

      try {
        const logsResponse = await fetchLogs(clientId, client.api_key)
        if (!cancelled) {
          setLogs(logsResponse.logs || [])
        }
      } catch (requestError) {
        console.log("Logs fetch failed:", requestError)
        if (!cancelled) {
          setLogs(fallback.logs)
        }
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    loadLiveData()

    return () => {
      cancelled = true
    }
  }, [client, clientId, isLiveClient])

  useEffect(() => {
    if (!isLiveClient || !liveMessages.length) {
      return
    }

    const pendingMessages = liveMessages.slice(processedMessageCount.current)
    if (!pendingMessages.length) {
      return
    }

    processedMessageCount.current = liveMessages.length

    setLogs((previousLogs) => [...pendingMessages.map((message) => normalizeLiveLog(message)), ...previousLogs])

    setStats((previousStats) => {
      if (!previousStats) {
        return previousStats
      }

      return pendingMessages.reduce((currentStats, message) => updateStatsFromMessage(currentStats, message), previousStats)
    })
  }, [isLiveClient, liveMessages])

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6 text-[var(--text-primary)]">
        <div className="max-w-xl rounded-[28px] border border-slate-300 bg-[var(--bg-card)] p-8 text-center">
          <div className="text-sm uppercase tracking-[0.35em] text-[var(--text-secondary)]">Not found</div>
          <h1 className="mt-4 text-3xl font-semibold">Client not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            The selected tenant does not exist in the hardcoded client list.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] md:flex-row">
      <Sidebar activeClientId={clientId} />

      <main className="flex-1 space-y-6 overflow-y-auto p-6 lg:p-8">
        <section className="rounded-[30px] border border-slate-300 bg-[var(--bg-card)] px-6 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">Client Details</div>
              <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)] md:text-4xl">{client.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1">Plan: {client.plan}</span>
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1">API Key: {client.api_key}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  {client.status}
                </span>
                {isLiveClient ? (
                  <span
                    className={`rounded-full border px-3 py-1 ${connected ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-300 bg-slate-50 text-[var(--text-secondary)]'}`}
                  >
                    {connected ? 'WebSocket connected' : 'Connecting to live feed...'}
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[var(--text-secondary)]">
                    Demo data only
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {clientId === 1 ? (
                <button
                  type="button"
                  onClick={() => navigate('/portal/shoptalk', { state: { chatOpen: false } })}
                  className="bg-white text-[#0f172a] border-[1.5px] border-[#cbd5e1] rounded-[8px] px-[24px] py-[12px] font-[600] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:bg-[#f8fafc] hover:border-[#94a3b8] transition cursor-pointer"
                >
                  🌐 Open StyleHub Portal — Live Demo
                </button>
              ) : null}

              <div className="rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-[var(--text-secondary)]">
                {isLiveClient ? 'Demo Client is connected to the real backend.' : 'This tenant uses hardcoded demo data and local simulation.'}
              </div>
            </div>
          </div>

        </section>

        <StatsCards stats={stats} loading={loading} />

        <Charts stats={stats} loading={loading} />

        <ThreatTable logs={logs} loading={loading} />
      </main>
    </div>
  )
}
