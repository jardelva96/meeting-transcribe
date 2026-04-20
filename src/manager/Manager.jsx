import { useState, useEffect, useCallback } from 'react'
import { getAllSessions, getEntriesBySession, deleteSession, exportSessionAsTXT, exportSessionAsJSON, downloadBlob } from '../services/db'
import AIPanel from '../components/AIPanel'
import Settings from '../components/Settings'
import Modal from '../components/Modal'
import { Mic, Settings as SettingsIcon, X, ClipboardList, Sparkles, Copy, Download } from 'lucide-react'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start, end) {
  if (!end) return '—'
  const s = Math.floor((end - start) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Manager() {
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null) // { id, name }

  useEffect(() => {
    getAllSessions().then(s => { setSessions(s); setLoading(false) }).catch(console.error)
  }, [])

  const openSession = useCallback(async (session) => {
    setSelected(session)
    setShowAI(false)
    const data = await getEntriesBySession(session.id)
    setEntries(data)
  }, [])

  const confirmDelete = useCallback((sessionId, name, e) => {
    e.stopPropagation()
    setDeleteModal({ id: sessionId, name })
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteModal) return
    await deleteSession(deleteModal.id)
    setSessions(prev => prev.filter(s => s.id !== deleteModal.id))
    if (selected?.id === deleteModal.id) { setSelected(null); setEntries([]) }
    setDeleteModal(null)
  }, [deleteModal, selected])

  const handleExportTXT = useCallback(async () => {
    if (!selected) return
    const content = await exportSessionAsTXT(selected, entries)
    downloadBlob(content, `${selected.name.replace(/\s+/g,'_')}.txt`, 'text/plain')
  }, [selected, entries])

  const handleExportJSON = useCallback(async () => {
    if (!selected) return
    const content = await exportSessionAsJSON(selected, entries)
    downloadBlob(content, `${selected.name.replace(/\s+/g,'_')}.json`, 'application/json')
  }, [selected, entries])

  const handleCopy = useCallback(() => {
    const text = entries.map(e => `[${formatTime(e.timestamp)}] ${e.text}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [entries])

  const filtered = sessions.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="mgr">
      {/* Sidebar */}
      <aside className="mgr-sidebar">
        <div className="mgr-sidebar-header">
          <div className="mgr-brand">
            <Mic size={16} strokeWidth={1.8} />
            <span>Meeting Transcribe</span>
          </div>
          <button className="mgr-settings-btn" onClick={() => setShowSettings(true)} title="Configurações"><SettingsIcon size={15} strokeWidth={1.8} /></button>
        </div>

        <div className="mgr-search-wrap">
          <input
            className="mgr-search"
            placeholder="Buscar reuniões..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="mgr-sessions-list">
          {loading && <p className="mgr-hint">Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <p className="mgr-hint">Nenhuma reunião encontrada.</p>
          )}
          {filtered.map(s => (
            <button
              key={s.id}
              className={`mgr-session-item ${selected?.id === s.id ? 'active' : ''}`}
              onClick={() => openSession(s)}
            >
              <div className="mgr-session-item-top">
                <span className="mgr-session-item-name">{s.name}</span>
                <button className="mgr-delete-btn" onClick={e => confirmDelete(s.id, s.name, e)} title="Excluir"><X size={12} strokeWidth={2.5} /></button>
              </div>
              <div className="mgr-session-item-meta">
                <span>{formatDate(s.startedAt)}</span>
                <span>{s.totalEntries ?? 0} segmentos</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mgr-sidebar-footer">
          <p className="mgr-hint">{sessions.length} reunião{sessions.length !== 1 ? 'ões' : ''} salva{sessions.length !== 1 ? 's' : ''}</p>
          <div className="mgr-shortcuts">
            <span>Gravar: <kbd>Ctrl+Shift+T</kbd></span>
            <span>Abrir painel: <kbd>Ctrl+Shift+M</kbd></span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="mgr-main">
        {!selected ? (
          <div className="mgr-empty-state">
            <ClipboardList size={40} strokeWidth={1.2} className="mgr-empty-icon" />
            <h2>Selecione uma reunião</h2>
            <p>Escolha uma sessão na lista à esquerda para visualizar a transcrição e usar as ferramentas de IA.</p>
          </div>
        ) : (
          <>
            <div className="mgr-content-header">
              <div className="mgr-content-title-area">
                <h1 className="mgr-content-title">{selected.name}</h1>
                <div className="mgr-content-meta">
                  <span>{formatDate(selected.startedAt)}</span>
                  <span>Duração: {formatDuration(selected.startedAt, selected.endedAt)}</span>
                  <span>{entries.length} segmentos</span>
                </div>
              </div>
              <div className="mgr-content-actions">
                <button
                  className={`mgr-action-btn ${showAI ? 'active' : ''}`}
                  onClick={() => setShowAI(v => !v)}
                >
                  <Sparkles size={13} strokeWidth={1.8} /> Ferramentas de IA
                </button>
                <button className="mgr-action-btn" onClick={handleCopy}>
                  <Copy size={13} strokeWidth={2} /> {copied ? 'Copiado' : 'Copiar tudo'}
                </button>
                <button className="mgr-action-btn" onClick={handleExportTXT}><Download size={13} strokeWidth={2} /> TXT</button>
                <button className="mgr-action-btn" onClick={handleExportJSON}><Download size={13} strokeWidth={2} /> JSON</button>
              </div>
            </div>

            {showAI && entries.length > 0 && (
              <div className="mgr-ai-section">
                <AIPanel entries={entries} />
              </div>
            )}

            <div className="mgr-transcript">
              {entries.length === 0 && (
                <p className="mgr-hint" style={{ padding: '24px' }}>Esta sessão não tem segmentos transcritos.</p>
              )}
              {entries.map((entry, idx) => (
                <div key={entry.id ?? idx} className="mgr-entry">
                  <div className="mgr-entry-header">
                    <span className="mgr-entry-idx">#{idx + 1}</span>
                    <span className="mgr-entry-time">{formatTime(entry.timestamp)}</span>
                  </div>
                  <p className="mgr-entry-text">{entry.text}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {deleteModal && (
        <Modal
          title="Excluir sessão"
          message={`"${deleteModal.name}" será removida permanentemente. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    </div>
  )
}
