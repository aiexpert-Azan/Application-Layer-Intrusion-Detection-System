import { useEffect, useMemo, useRef, useState } from 'react'

import { sendQuery, uploadFile } from '../utils/api'

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function detectLocalThreat(query) {
  const lowerQuery = query.toLowerCase()

  if (
    lowerQuery.includes('ignore previous') ||
    lowerQuery.includes('system prompt') ||
    lowerQuery.includes('developer mode') ||
    lowerQuery.includes('reveal the hidden')
  ) {
    return { blocked: true, threat_type: 'PROMPT_INJECTION', confidence: 95 }
  }

  if (
    lowerQuery.includes('password') ||
    lowerQuery.includes('api key') ||
    lowerQuery.includes('token') ||
    lowerQuery.includes('secret') ||
    lowerQuery.includes('confidential')
  ) {
    return { blocked: true, threat_type: 'SENSITIVE_INFO', confidence: 91 }
  }

  if (
    lowerQuery.includes('other tenant') ||
    lowerQuery.includes('another tenant') ||
    lowerQuery.includes('cross tenant') ||
    lowerQuery.includes('customer data')
  ) {
    return { blocked: true, threat_type: 'CROSS_TENANT_ATTEMPT', confidence: 93 }
  }

  if (lowerQuery.includes('output') || lowerQuery.includes('format') || lowerQuery.includes('markdown')) {
    return { blocked: true, threat_type: 'OUTPUT_INJECTION', confidence: 88 }
  }

  return {
    blocked: false,
    response: 'Request processed locally. No security violations were detected.',
  }
}

function analyzeLocalFile(file) {
  const lowerName = (file?.name || '').toLowerCase()

  if (lowerName.includes('prompt') || lowerName.includes('payload') || lowerName.includes('injection')) {
    return { blocked: true, threat_type: 'INDIRECT_INJECTION', confidence: 94 }
  }

  return {
    blocked: false,
    response: 'File analyzed locally — no threats detected.',
  }
}

function formatSender(role) {
  return role === 'assistant' ? 'AI' : role === 'user' ? 'You' : 'System'
}

function MessageBubble({ message }) {
  if (message.kind === 'threat') {
    return (
      <div className="rounded-3xl border border-red-400/[0.35] bg-red-500/[0.12] px-4 py-4 text-left text-red-100 shadow-[0_12px_28px_rgba(239,68,68,0.08)]">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-red-200">
          ⚠️ Security Violation Detected!
        </div>
        <div className="mt-2 text-base font-semibold">Threat: {message.threatType}</div>
        <div className="mt-1 text-sm text-red-100/85">Confidence: {message.confidence}%</div>
        <div className="mt-3 text-sm text-red-50/90">This request has been blocked and logged.</div>
      </div>
    )
  }

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.18)] ${
          isUser
            ? 'bg-blue-500/20 text-blue-50 ring-1 ring-blue-400/20'
            : isSystem
              ? 'bg-white/[0.06] text-[var(--text-secondary)] ring-1 ring-white/10'
              : 'bg-white/[0.08] text-white ring-1 ring-white/10'
        }`}
      >
        <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-white/45">{formatSender(message.role)}</div>
        <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
      </div>
    </div>
  )
}

export default function ChatPlayground({ clientName, apiKey, isLive = false }) {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef(null)
  const clientLabel = useMemo(() => clientName || 'the selected client', [clientName])

  useEffect(() => {
    setMessages([
      {
        id: createId('welcome'),
        role: 'assistant',
        content: `Hello! I'm the AI assistant for ${clientLabel}.\nHow can I help you today?\n(This is a security testing playground)`,
      },
    ])
    setHistory([])
    setInput('')
    setLoading(false)
    setFileLoading(false)
  }, [clientLabel])

  const appendMessage = (message) => {
    setMessages((previous) => [...previous, { id: createId(message.role), ...message }])
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading || fileLoading) {
      return
    }

    appendMessage({ role: 'user', content: trimmed })
    setInput('')
    setLoading(true)

    try {
      if (isLive) {
        const response = await sendQuery(trimmed, apiKey, history)

        if (response.blocked) {
          appendMessage({
            role: 'system',
            kind: 'threat',
            threatType: response.threat_type,
            confidence: Math.round(Number(response.confidence) || 0),
          })
        } else {
          const assistantReply = response.response || 'No response returned from the security gateway.'
          appendMessage({ role: 'assistant', content: assistantReply })
          setHistory((previous) => [...previous, { role: 'user', content: trimmed }, { role: 'assistant', content: assistantReply }])
        }
      } else {
        const localResult = detectLocalThreat(trimmed)

        if (localResult.blocked) {
          appendMessage({
            role: 'system',
            kind: 'threat',
            threatType: localResult.threat_type,
            confidence: localResult.confidence,
          })
        } else {
          const assistantReply = `${localResult.response} ${clientLabel} is running in demo mode.`
          appendMessage({ role: 'assistant', content: assistantReply })
          setHistory((previous) => [...previous, { role: 'user', content: trimmed }, { role: 'assistant', content: assistantReply }])
        }
      }
    } catch (error) {
      appendMessage({
        role: 'system',
        kind: 'message',
        content: error?.message || 'Unable to complete the security request.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || loading || fileLoading) {
      return
    }

    appendMessage({ role: 'system', content: '📎 Analyzing file...' })
    setFileLoading(true)

    try {
      if (isLive) {
        const response = await uploadFile(file, apiKey)

        if (response.blocked) {
          appendMessage({
            role: 'system',
            kind: 'threat',
            threatType: response.threat_type,
            confidence: Math.round(Number(response.confidence) || 0),
          })
        } else {
          appendMessage({ role: 'assistant', content: '✅ File analyzed — no threats detected' })
        }
      } else {
        const localResult = analyzeLocalFile(file)

        if (localResult.blocked) {
          appendMessage({
            role: 'system',
            kind: 'threat',
            threatType: localResult.threat_type,
            confidence: localResult.confidence,
          })
        } else {
          appendMessage({ role: 'assistant', content: '✅ File analyzed — no threats detected' })
        }
      }
    } catch (error) {
      appendMessage({
        role: 'system',
        content: error?.message || 'File analysis failed.',
      })
    } finally {
      setFileLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <section className="rounded-[28px] border border-white/[0.06] bg-[var(--bg-card)] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="text-xs uppercase tracking-[0.35em] text-red-300">🔴 Security Playground</div>
        <h3 className="mt-2 text-2xl font-semibold text-white">Test security gateway in real-time</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Try benign prompts or attack patterns to verify how the tenant responds.
        </p>
      </div>

      <div className="thin-scrollbar max-h-[540px] space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {(loading || fileLoading) && (
          <div className="flex justify-start">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.07] px-4 py-3 text-sm text-[var(--text-secondary)] ring-1 ring-white/[0.06]">
              AI is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Message</label>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or try an attack..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/[0.08] bg-[#0f1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--text-secondary)] focus:border-red-400/45 focus:ring-2 focus:ring-red-400/10"
            />
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || fileLoading}
              className="inline-flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition hover:border-white/[0.16] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              📎 Upload
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={loading || fileLoading || !input.trim()}
              className="inline-flex items-center justify-center rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
