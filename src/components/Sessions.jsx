import { X, Download, ChevronRight } from 'lucide-react'

function duration(start, end) {
  const ms = (end || Date.now()) - start
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return min > 0 ? `${min}min ${sec}s` : `${sec}s`
}

function SessionModal({ session, entries, loading, onClose, onExportJSON, onExportTXT, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{session.name}</h2>
            <p className="modal-meta">
              {new Date(session.startedAt).toLocaleString('pt-BR')} &bull; {session.totalEntries} segmentos
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-actions">
          <button className="export-btn" onClick={() => onExportJSON(session, entries)}>
            <Download size={11} strokeWidth={2} /> JSON
          </button>
          <button className="export-btn" onClick={() => onExportTXT(session, entries)}>
            <Download size={11} strokeWidth={2} /> TXT
          </button>
          <button className="export-btn export-btn-danger" onClick={() => { onDelete(session.id); onClose() }}>
            Apagar
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="modal-loading">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="modal-empty">Nenhuma transcrição registrada.</p>
          ) : (
            [...entries].sort((a, b) => a.timestamp - b.timestamp).map((e, i) => (
              <div key={e.id ?? e.timestamp} className="modal-entry">
                <div className="modal-entry-header">
                  <span className="modal-entry-num">#{i + 1}</span>
                  <span className="modal-entry-time">
                    {new Date(e.timestamp).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <p className="modal-entry-answer">{e.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function Sessions({ sessions, currentSession, viewSession, viewEntries, loading, onOpen, onClose, onDelete, onExportJSON, onExportTXT }) {
  const past = sessions.filter((s) => s.id !== currentSession?.id)
  if (past.length === 0) return null

  return (
    <>
      <div className="sessions-section">
        <h3 className="history-title">Sessões anteriores</h3>
        <div className="sessions-list">
          {past.map((s) => (
            <button key={s.id} className="session-item" onClick={() => onOpen(s)}>
              <div className="session-item-left">
                <span className="session-name">{s.name}</span>
                <span className="session-meta">
                  {new Date(s.startedAt).toLocaleDateString('pt-BR')} &bull; {s.totalEntries} segmentos &bull; {duration(s.startedAt, s.endedAt)}
                </span>
              </div>
              <ChevronRight size={14} strokeWidth={2} className="session-arrow" />
            </button>
          ))}
        </div>
      </div>

      {viewSession && (
        <SessionModal
          session={viewSession}
          entries={viewEntries}
          loading={loading}
          onClose={onClose}
          onExportJSON={onExportJSON}
          onExportTXT={onExportTXT}
          onDelete={onDelete}
        />
      )}
    </>
  )
}
