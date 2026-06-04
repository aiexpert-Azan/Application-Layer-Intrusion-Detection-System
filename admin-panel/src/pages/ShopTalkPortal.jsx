import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useWebSocket from '../hooks/useWebSocket'

const PRODUCTS = [
  { id: 1, name: 'Classic White Tee', price: 1299, rating: 5, img: 'https://picsum.photos/id/1/400/300' },
  { id: 2, name: 'Denim Jacket', price: 4599, rating: 4, img: 'https://picsum.photos/id/18/400/300' },
  { id: 3, name: 'Floral Dress', price: 2899, rating: 5, img: 'https://picsum.photos/id/21/400/300' },
  { id: 4, name: 'Slim Fit Chinos', price: 2199, rating: 4, img: 'https://picsum.photos/id/60/400/300' },
  { id: 5, name: 'Striped Polo', price: 1599, rating: 4, img: 'https://picsum.photos/id/85/400/300' },
  { id: 6, name: 'Summer Shorts', price: 1099, rating: 3, img: 'https://picsum.photos/id/94/400/300' }
]

const CATEGORIES = [
  { name: 'Men', icon: '👔' },
  { name: 'Women', icon: '👗' },
  { name: 'Kids', icon: '🧸' },
  { name: 'Sale', icon: '🏷️' }
]

const CHAT_STORAGE_KEY = "stylehub_chat_messages"

const initialBotMessage = {
  id: 1,
  role: "bot",
  content: "👋 Hello! I'm the StyleHub AI Assistant.\nI can help you with:\n- Product information & availability\n- Order tracking & returns\n- Size guides & recommendations\n- Store locations & timings\n\nHow can I help you today?",
  timestamp: new Date().toISOString()
}

const getInitialMessages = () => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {}
  return [initialBotMessage]
}

export default function ShopTalkPortal() {
  const navigate = useNavigate()
  const location = useLocation()

  const [chatOpen, setChatOpen] = useState(() => {
    if (location.state && typeof location.state.chatOpen === 'boolean') {
      return location.state.chatOpen
    }
    return false
  })
  const [unread, setUnread] = useState(0)

  const [messages, setMessages] = useState(getInitialMessages)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [cartCount, setCartCount] = useState(0)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Use the live WebSocket hook for Client 1
  const { messages: wsMessages } = useWebSocket(1)
  const wsProcessedCount = useRef(0)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, uploadStatus])

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAT_STORAGE_KEY, 
        JSON.stringify(messages)
      )
    } catch (e) {}
  }, [messages])

  useEffect(() => {
    if (chatOpen) {
      setUnread(0)
    }
  }, [chatOpen])

  // Handle incoming attacks from websocket feed
  useEffect(() => {
    if (!wsMessages || wsMessages.length <= wsProcessedCount.current) {
      return
    }

    const newWsMessages = wsMessages.slice(wsProcessedCount.current)
    wsProcessedCount.current = wsMessages.length

    newWsMessages.forEach(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ws-${Date.now()}-${Math.random()}`,
          role: 'system',
          content: '🔴 Attack intercepted by SecureIDS gateway'
        }
      ])
      if (!chatOpen) {
        setUnread((prev) => prev + 1)
      }
    })
  }, [wsMessages, chatOpen])

  const sendMessage = async (message) => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/query",
        {
          method: "POST",
          mode: "cors",
          headers: {
            "X-API-Key": "sk-shoptalk-001",
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            query: message,
            conversation_history: []
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    const text = inputText.trim()
    if (!text || isTyping) return

    // 1. Add user message to chat
    const userMsgId = `user-${Date.now()}`
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: text }])
    setInputText('')

    // 2. Show typing indicator
    setIsTyping(true)

    try {
      const data = await sendMessage(text)

      // 4. If response is blocked, show red alert card
      if (data.blocked === true || data.blocked === 'true') {
        setMessages((prev) => [
          ...prev,
          {
            id: `blocked-${Date.now()}`,
            role: 'blocked',
            threat_type: data.threat_type || 'Unknown Threat',
            confidence: Math.round(Number(data.confidence) || 0)
          }
        ])
        if (!chatOpen) {
          setUnread((prev) => prev + 1)
        }
      } else {
        // 5. If safe, show response
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'assistant',
            content: data.response || 'No reply received from gateway.'
          }
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `⚠️ Error: ${err.message}`
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Show Analyzing status
    setUploadStatus('🔍 Analyzing file for threats...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // 2. Call POST /api/upload
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        headers: {
          'X-API-Key': 'sk-shoptalk-001'
        },
        body: formData
      })

      if (!res.ok) {
        throw new Error('File upload failed. Check connection.')
      }

      const data = await res.json()

      // 3. Check if blocked
      if (data.blocked === true || data.blocked === 'true') {
        setMessages((prev) => [
          ...prev,
          {
            id: `blocked-${Date.now()}`,
            role: 'blocked',
            threat_type: data.threat_type || 'Malicious File Content',
            confidence: Math.round(Number(data.confidence) || 0)
          }
        ])
        if (!chatOpen) {
          setUnread((prev) => prev + 1)
        }
        setUploadStatus('')
      } else {
        // 4. If safe
        setUploadStatus('✅ File is clean — no threats found')
        setTimeout(() => setUploadStatus(''), 4000)
      }
    } catch (err) {
      setUploadStatus(`⚠️ Upload Error: ${err.message}`)
      setTimeout(() => setUploadStatus(''), 5000)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans relative">
      {/* LEFT COLUMN: E-commerce Website */}
      <div 
        className={`flex flex-col h-full bg-white border-r border-slate-200 relative ${chatOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{
          width: chatOpen ? '60%' : '100%',
          transition: 'width 0.3s ease-in-out'
        }}
      >
        <button
          onClick={() => navigate('/client/1')}
          className="fixed top-[12px] left-[12px] z-[999] bg-white border border-[#e2e8f0] rounded-[8px] px-[16px] py-[8px] text-[13px] font-[600] text-[#374151] shadow-[0_1px_4px_rgba(0,0,0,0.1)] cursor-pointer flex items-center gap-[6px] hover:bg-[#f8fafc] transition"
        >
          ← Back to Dashboard
        </button>

        {chatOpen && (
          <div className="absolute inset-0 bg-black/40 z-20 pointer-events-auto transition-opacity duration-300" />
        )}
        
        {/* Header/Navbar */}
        <header className="sticky top-0 bg-white border-b border-slate-100 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-2xl font-bold cursor-pointer" onClick={() => navigate('/client/1')}>
              👗 StyleHub
            </span>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
              <span className="hover:text-blue-600 cursor-pointer">Home</span>
              <span className="hover:text-blue-600 cursor-pointer">Shop</span>
              <span className="hover:text-blue-600 cursor-pointer text-red-500">Sale</span>
              <span className="hover:text-blue-600 cursor-pointer">About</span>
              <span className="hover:text-blue-600 cursor-pointer">Contact</span>
            </nav>
          </div>

          <div className="flex items-center gap-4 w-1/3">
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-xs outline-none focus:border-slate-300"
            />
            <div className="relative cursor-pointer" onClick={() => setCartCount(c => c + 1)}>
              <span className="text-xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#1e40af] text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-14 text-left border-b border-slate-100">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Summer Collection 2026
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Discover the latest trends in apparel and secure premium style.
          </p>
          <div className="mt-6 flex gap-4">
            <button className="bg-slate-950 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm">
              Shop Now
            </button>
            <button className="border border-slate-300 bg-white font-medium px-5 py-2.5 rounded-lg hover:bg-slate-50 transition text-sm">
              View Lookbook
            </button>
          </div>
        </section>

        {/* Featured Products Grid */}
        <section className="px-8 py-10">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {PRODUCTS.map((prod) => (
              <div key={prod.id} className="border border-slate-200 rounded-2xl overflow-hidden p-4 bg-white hover:shadow-md transition duration-200">
                <img 
                  src={prod.img} 
                  alt={prod.name} 
                  className="w-full h-44 object-cover rounded-xl bg-slate-100 mb-4"
                />
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm">{prod.name}</h3>
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < prod.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 mb-3">Rs. {prod.price.toLocaleString()}</div>
                <button 
                  onClick={() => setCartCount(c => c + 1)}
                  className="w-full border border-slate-200 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50 transition"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section className="px-8 py-8 border-t border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Shop By Category</h2>
          <div className="grid grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.name} 
                className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition text-center cursor-pointer shadow-sm"
              >
                <div className="text-3xl mb-1">{cat.icon}</div>
                <div className="text-xs font-semibold text-slate-700">{cat.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-100 px-8 py-6 flex items-center justify-between text-xs text-slate-500">
          <div>© Copyright StyleHub 2026</div>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span className="hover:underline cursor-pointer">Terms</span>
            <span className="hover:underline cursor-pointer">Support</span>
          </div>
        </footer>
      </div>

      {/* Chat bubble button (visible when chatOpen is false) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-[1000] w-16 h-16 rounded-full bg-[#1e40af] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform duration-200 cursor-pointer border-none"
          style={{ transition: 'transform 0.2s ease-in-out' }}
        >
          <span className="text-3xl">💬</span>
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
              {unread}
            </span>
          ) : (
            messages.length > 1 && (
              <span className="absolute top-1 right-1 bg-red-500 w-3 h-3 rounded-full border border-white" />
            )
          )}
        </button>
      )}

      {/* RIGHT COLUMN: Chat Widget */}
      <div 
        className="flex flex-col h-full bg-white relative border-l border-slate-200"
        style={{
          width: chatOpen ? '40%' : '0%',
          opacity: chatOpen ? 1 : 0,
          transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out',
          overflow: 'hidden'
        }}
      >
        
        {/* Chat Header */}
        <div className="bg-[#1e40af] text-white px-5 py-4 flex items-center justify-between shadow-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide leading-tight">StyleHub AI Assistant</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="text-[10px] text-blue-100 font-medium">Online — Powered by SecureIDS Gateway</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem(CHAT_STORAGE_KEY)
                setMessages(getInitialMessages())
              }}
              className="text-white hover:bg-white/10 p-2 rounded-full transition text-lg bg-transparent border-none cursor-pointer"
              title="Clear Chat"
            >
              🗑️
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-white/10 p-2 rounded-full transition text-lg bg-transparent border-none cursor-pointer font-bold"
              title="Minimize"
            >
              —
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 thin-scrollbar bg-slate-50/30 pb-28">
          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-xs font-semibold animate-pulse shadow-sm">
                    {msg.content}
                  </div>
                </div>
              )
            }

            if (msg.role === 'blocked') {
              return (
                <div key={msg.id} className="w-full bg-[#fef2f2] border border-[#ef4444] rounded-xl p-4 text-left shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <h4 className="font-bold text-red-700 text-sm">Security Violation Detected</h4>
                      <div className="text-xs text-red-600 mt-1.5 space-y-0.5">
                        <p><strong>Threat:</strong> {msg.threat_type}</p>
                        <p><strong>Confidence:</strong> {msg.confidence}%</p>
                        <p className="mt-2 text-slate-500 font-medium">This request has been blocked and logged to the security dashboard.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            const isUser = msg.role === 'user'
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser 
                      ? 'bg-[#1e40af] text-white rounded-br-none shadow-[0_3px_10px_rgba(30,64,175,0.15)]' 
                      : 'bg-[#f1f5f9] text-[#0f172a] rounded-bl-none border border-slate-200/50'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#f1f5f9] text-[#0f172a] border border-slate-200/50 px-4 py-3 rounded-2xl rounded-bl-none text-xs font-medium italic animate-pulse">
                StyleHub AI is typing...
              </div>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus && (
            <div className="flex justify-start">
              <div className="bg-[#f1f5f9] text-[#0f172a] border border-slate-200/50 px-4 py-3 rounded-2xl rounded-bl-none text-xs font-medium">
                {uploadStatus}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Area (fixed at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-10 shrink-0">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
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
              className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50 transition text-lg bg-transparent cursor-pointer"
              title="Upload PDF or Image"
            >
              📎
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about products or try an attack..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs outline-none focus:border-slate-300"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="bg-[#1e40af] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#1d4ed8] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
            >
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
