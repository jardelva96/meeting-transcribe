import { useState } from 'react'

function SegmentCard({ item, index, total }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(item.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="history-card fade-in">
      <div className="history-card-top">
        <span className="history-index">#{total - index}</span>
        <span className="history-time">
          {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      <div className="history-answer">
        <div className="history-answer-header">
          <span className="hlabel">Transcrição</span>
          <button className={`mini-copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
            {copied ? '✓' : 'Copiar'}
          </button>
        </div>
        <p>{item.text}</p>
      </div>
    </div>
  )
}

export default function TranscriptFeed({ entries, onExportJSON, onExportTXT }) {
  const [search, setSearch] = useState('')

  if (entries.length === 0) return null

  const filtered = search.trim()
    ? entries.filter((e) => (e.text || '').toLowerCase().includes(search.toLowerCase()))
    : entries

  return (
    <div className="history-section">
      <div className="history-header">
        <div className="history-header-left">
          <h3 className="history-title">Transcrição da sessão</h3>
          <span className="history-count">{entries.length}</span>
        </div>
        <div className="history-header-right">
          <button className="export-btn" onClick={onExportJSON} title="Exportar JSON">JSON</button>
          <button className="export-btn" onClick={onExportTXT} title="Exportar TXT">TXT</button>
        </div>
      </div>

      {entries.length >= 3 && (
        <div className="search-wrap">
          <input
            className="search-input"
            type="text"
            placeholder="Buscar na transcrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="search-empty">Nenhum resultado para "{search}"</p>
      )}

      <div className="history-list">
        {filtered.map((item, i) => (
          <SegmentCard key={item.id ?? item.timestamp} item={item} index={i} total={filtered.length} />
        ))}
      </div>
    </div>
  )
}
