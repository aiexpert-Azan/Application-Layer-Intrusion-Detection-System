import { useEffect, useRef, useState } from 'react'

export default function useWebSocket(clientId) {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  useEffect(() => {
    if (!clientId) {
      setMessages([])
      setConnected(false)
      return undefined
    }

    let cancelled = false

    const connect = () => {
      if (cancelled) {
        return
      }

      const WS_URL = import.meta.env.VITE_WS_URL || "wss://application-layer-intrusion-detection.onrender.com"

      const socket = new WebSocket(`${WS_URL}/ws/${clientId}`)
      socketRef.current = socket

      socket.onopen = () => {
        setConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          setMessages((previous) => [...previous, payload])
        } catch {
          setMessages((previous) => [...previous, { raw: event.data }])
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      socket.onclose = () => {
        setConnected(false)
        socketRef.current = null

        if (!cancelled) {
          reconnectTimerRef.current = window.setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      cancelled = true

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }

      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [clientId])

  return { messages, connected }
}
