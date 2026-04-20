import { useState } from 'react'
import {
  generateResumo,
  generateActionItems,
  generateQA,
  generateEmail,
  generateInsights,
} from '../services/ai'

const FEATURES = [
  {
    id: 'resumo',
    icon: '📝',
    label: 'Resumo',
    description: 'Resumo executivo estruturado da reunião',
    fn: generateResumo,
  },
  {
    id: 'actions',
    icon: '✅',
    label: 'Action Items',
    description: 'Tarefas e próximos passos com responsáveis',
    fn: generateActionItems,
  },
  {
    id: 'qa',
    icon: '💬',
    label: 'Debates',
    description: 'Temas debatidos, perguntas e posições',
    fn: generateQA,
  },
  {
    id: 'email',
    icon: '📧',
    label: 'Follow-up',
    description: 'Email de follow-up pronto para enviar',
    fn: generateEmail,
  },
  {
    id: 'insights',
    icon: '📊',
    label: 'Insights',
    description: 'Análise de tom, decisões e oportunidades',
    fn: generateInsights,
  },
]

export default function AIPanel({ entries }) {
  const [activeId, setActiveId] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const transcript = entries.map((e) => e.text).join('\n')

  const run = async (feature) => {
    if (loading) return
    setActiveId(feature.id)
    setResult('')
    setError(null)
    setLoading(true)
    try {
      const text = await feature.fn(transcript)
      setResult(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const activeFeature = FEATURES.find((f) => f.id === activeId)

  return (
    <div className="ai-panel card fade-in">
      <div className="card-header">
        <span className="dot" style={{ background: '#a78bfa' }} />
        Ferramentas de IA
      </div>

      <div className="ai-features-grid">
        {FEATURES.map((f) => (
          <button
            key={f.id}
            className={`ai-feature-btn ${activeId === f.id ? 'active' : ''} ${loading && activeId === f.id ? 'loading' : ''}`}
            onClick={() => run(f)}
            disabled={loading}
            title={f.description}
          >
            <span className="ai-feature-icon">{f.icon}</span>
            <span className="ai-feature-label">{f.label}</span>
          </button>
        ))}
      </div>

      {(loading || result || error) && (
        <div className="ai-result-area fade-in">
          <div className="ai-result-header">
            <span className="ai-result-title">
              {activeFeature?.icon} {activeFeature?.label}
            </span>
            {result && (
              <button className={`mini-copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            )}
          </div>

          {loading && (
            <div className="ai-loading">
              <span className="ai-spinner" />
              Gerando com IA...
            </div>
          )}

          {error && <p className="ai-error">{error}</p>}

          {result && (
            <div className="ai-result-text">
              {result.split('\n').map((line, i) => (
                <p key={i} className={line.startsWith('**') || line.startsWith('#') ? 'ai-bold-line' : ''}>
                  {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
