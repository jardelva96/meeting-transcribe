import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, List, ListChecks, HelpCircle, Mail, BarChart2, AlertTriangle } from 'lucide-react'
import {
  generateResumo,
  generateActionItems,
  generateQA,
  generateEmail,
  generateInsights,
  askQuestion,
} from '../services/ai'

const QUICK_ACTIONS = [
  { Icon: List,        label: 'Quais são os pontos principais até agora?', fn: generateResumo },
  { Icon: ListChecks,  label: 'Listar action items e próximos passos',     fn: generateActionItems },
  { Icon: HelpCircle,  label: 'Quais foram os principais debates?',        fn: generateQA },
  { Icon: Mail,        label: 'Criar email de follow-up',                  fn: generateEmail },
  { Icon: BarChart2,   label: 'Analisar insights e tom da reunião',        fn: generateInsights },
]

export default function AIChat({ entries }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const feedRef = useRef(null)

  const transcript = entries.map(e => e.text).join('\n')
  const hasTranscript = entries.length > 0

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages])

  const run = async (label, fn) => {
    if (loading || !hasTranscript) return
    setLoading(true)
    setMessages(prev => [...prev, { type: 'question', text: label }])
    try {
      const answer = await fn(transcript)
      setMessages(prev => [...prev, { type: 'answer', text: answer }])
    } catch (err) {
      setMessages(prev => [...prev, { type: 'error', text: err.message }])
    } finally {
      setLoading(false)
    }
  }

  const runCustom = async () => {
    const q = question.trim()
    if (!q || loading || !hasTranscript) return
    setQuestion('')
    setLoading(true)
    setMessages(prev => [...prev, { type: 'question', text: q }])
    try {
      const answer = await askQuestion(transcript, q)
      setMessages(prev => [...prev, { type: 'answer', text: answer }])
    } catch (err) {
      setMessages(prev => [...prev, { type: 'error', text: err.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="aichat">
      {!hasTranscript ? (
        <div className="aichat-empty">
          <p>Grave uma reunião para usar as ferramentas de IA.</p>
          <p className="aichat-empty-hint">Todos os chats da IA são privados e visíveis somente para você.</p>
        </div>
      ) : (
        <>
          {messages.length === 0 && (
            <div className="aichat-actions">
              <p className="aichat-section-label">Esta Reunião</p>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  className="aichat-card"
                  onClick={() => run(action.label, action.fn)}
                  disabled={loading}
                >
                  <action.Icon className="aichat-card-icon" size={15} strokeWidth={1.8} />
                  <span className="aichat-card-label">{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="aichat-feed" ref={feedRef}>
              <button className="aichat-back" onClick={() => setMessages([])}>
                <ArrowLeft size={13} strokeWidth={2} /> Nova consulta
              </button>
              {messages.map((msg, i) => (
                <div key={i} className={`aichat-msg aichat-msg-${msg.type}`}>
                  {msg.type === 'question' && <p className="aichat-q">{msg.text}</p>}
                  {msg.type === 'answer' && (
                    <div className="aichat-a">
                      {msg.text.split('\n').map((line, j) => (
                        <p key={j} className={line.startsWith('**') || line.startsWith('#') ? 'aichat-bold' : ''}>
                          {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                        </p>
                      ))}
                    </div>
                  )}
                  {msg.type === 'error' && (
                    <p className="aichat-err">
                      <AlertTriangle size={13} strokeWidth={2} style={{ display: 'inline', marginRight: 5 }} />
                      {msg.text}
                    </p>
                  )}
                </div>
              ))}
              {loading && (
                <div className="aichat-loading">
                  <span className="aichat-dot" /><span className="aichat-dot" /><span className="aichat-dot" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="aichat-input-wrap">
        <textarea
          className="aichat-input"
          placeholder={hasTranscript ? 'Pergunte-me qualquer coisa...' : 'Grave primeiro para perguntar...'}
          value={question}
          disabled={!hasTranscript || loading}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runCustom() }
          }}
          rows={2}
        />
        <button
          className="aichat-send"
          onClick={runCustom}
          disabled={!question.trim() || !hasTranscript || loading}
        >
          <Send size={14} strokeWidth={2} />
        </button>
        <p className="aichat-privacy">Todos os chats da IA são privados e visíveis somente para você.</p>
      </div>
    </div>
  )
}
