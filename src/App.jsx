import { useState, useCallback, useEffect, useRef } from 'react'
import { useSystemAudio } from './hooks/useSystemAudio'
import { useDatabase } from './hooks/useDatabase'
import { useMeetCaption } from './hooks/useMeetCaption'
import Settings from './components/Settings'
import AIChat from './components/AIChat'
import Sessions from './components/Sessions'
import Modal from './components/Modal'
import { LayoutGrid, History, Settings as SettingsIcon, Copy, Download, Square, Mic, Bot, AlertTriangle } from 'lucide-react'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function useElapsed(session) {
  const [elapsed, setElapsed] = useState('00:00')
  useEffect(() => {
    if (!session) { setElapsed('00:00'); return }
    const upd = () => {
      const s = Math.floor((Date.now() - session.startedAt) / 1000)
      setElapsed(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`)
    }
    upd()
    const id = setInterval(upd, 1000)
    return () => clearInterval(id)
  }, [session])
  return elapsed
}

function openManager() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') })
  } else {
    window.open('/manager.html', '_blank')
  }
}

export default function App() {
  const db = useDatabase()
  const [tab, setTab] = useState('transcript')
  const [subTab, setSubTab] = useState('transcricao')
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [notes, setNotes] = useState('')
  const transcriptRef = useRef(null)
  const elapsed = useElapsed(db.currentSession)
  const sessionStartedRef = useRef(false)

  // ── Audio capture (fallback quando CC não está ativo) ──────────────────
  const onTranscription = useCallback(async (text) => {
    if (db.currentSession) await db.saveEntry({ text, timestamp: Date.now() })
  }, [db])

  const { isCapturing, transcript, startCapture, stopCapture, error, isSpeaking, audioLevel } =
    useSystemAudio({ onTranscription })

  // ── Meet CC (fonte primária quando disponível) ─────────────────────────
  const onCaption = useCallback(async (cap) => {
    // Abre sessão automaticamente quando CC começa
    if (!db.currentSession && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      await db.startSession(meetTitle || `Reunião ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
    }
    if (db.currentSession || sessionStartedRef.current) {
      await db.saveEntry({ text: cap.text, speaker: cap.speaker || '', timestamp: cap.timestamp })
    }
  }, [db])  // meetTitle will be used via closure below

  const { isMeetActive, isCCActive, meetTitle } = useMeetCaption({ onCaption })

  // Auto-start sessão quando usuário entra no Meet
  useEffect(() => {
    if (isMeetActive && meetTitle && !db.currentSession && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      db.startSession(meetTitle)
    }
    if (!isMeetActive) sessionStartedRef.current = false
  }, [isMeetActive, meetTitle, db])

  // Reset flag quando sessão encerra
  useEffect(() => {
    if (!db.currentSession) sessionStartedRef.current = false
  }, [db.currentSession])

  // ── Controle de gravação (audio capture) ──────────────────────────────
  const handleToggle = useCallback(async () => {
    if (isCapturing) {
      stopCapture()
    } else {
      if (!db.currentSession) {
        const name = meetTitle || `Reunião ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        await db.startSession(name)
      }
      startCapture()
    }
  }, [isCapturing, stopCapture, startCapture, db, meetTitle])

  // Auto-scroll
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [db.entries.length, transcript])

  const hasEntries = db.entries.length > 0
  const isLive = isCapturing || isCCActive

  // Label de status
  const statusLabel = isCCActive
    ? 'Lendo CC do Meet'
    : isCapturing
      ? (isSpeaking ? 'Capturando fala...' : 'Aguardando fala')
      : 'Pronto para gravar'

  return (
    <div className="sp">

      {/* ── Top bar ── */}
      <div className="sp-topbar">
        <div className="sp-topbar-left">
          <span className={`sp-rec-indicator ${isLive ? 'active' : ''}`} title={isLive ? 'Ativo' : 'Parado'} />
          {db.currentSession ? (
            <span className="sp-session-label" title={db.currentSession.name}>
              {db.currentSession.name.length > 20 ? db.currentSession.name.slice(0, 20) + '…' : db.currentSession.name}
              {isLive && <span className="sp-elapsed"> · {elapsed}</span>}
            </span>
          ) : (
            <span className="sp-session-label muted">Nenhuma sessão</span>
          )}
        </div>
        <div className="sp-topbar-right">
          <button className="sp-topbar-btn" onClick={openManager} title="Gerenciador de Sessões"><LayoutGrid size={15} strokeWidth={1.8} /></button>
          <button className="sp-topbar-btn" onClick={() => setShowHistory(true)} title="Histórico"><History size={15} strokeWidth={1.8} /></button>
          <button className="sp-topbar-btn" onClick={() => setShowSettings(true)} title="Configurações"><SettingsIcon size={15} strokeWidth={1.8} /></button>
        </div>
      </div>

      {/* ── Meet CC status banner ── */}
      {isMeetActive && (
        <div className={`sp-banner ${isCCActive ? 'sp-banner-cc' : 'sp-banner-info'}`}>
          <span className={`sp-banner-dot ${isCCActive ? 'active' : ''}`} />
          {isCCActive
            ? `CC ativo · ${meetTitle || 'Google Meet'}`
            : `Meet detectado · Ative o CC para transcrever automaticamente`
          }
          {!isCCActive && (
            <span className="sp-banner-hint">CC = botão ⌑ no rodapé</span>
          )}
        </div>
      )}

      {/* ── Main tabs ── */}
      <div className="sp-tabs">
        <button className={`sp-tab ${tab === 'transcript' ? 'active' : ''}`} onClick={() => setTab('transcript')}>
          Transcrição ao vivo
        </button>
        <button className={`sp-tab sp-tab-ai ${tab === 'ai' ? 'active' : ''}`} onClick={() => setTab('ai')}>
          <Bot size={13} strokeWidth={2} className="sp-tab-ai-icon" />
          Ferramentas de IA
        </button>
      </div>

      {/* ── Transcript tab ── */}
      {tab === 'transcript' && (
        <>
          {error && <div className="sp-banner sp-banner-error"><AlertTriangle size={13} strokeWidth={2} style={{marginRight:5}} />{error}</div>}

          {db.currentSession && !isLive && (
            <div className="sp-banner sp-banner-paused">
              Sessão pausada · {db.currentSession.name}
              <button className="sp-banner-btn" onClick={() => setShowFinishModal(true)}>Encerrar</button>
            </div>
          )}

          {/* Sub-abas */}
          <div className="sp-subtabs">
            <button className={`sp-subtab ${subTab === 'transcricao' ? 'active' : ''}`} onClick={() => setSubTab('transcricao')}>
              TRANSCRIÇÃO {hasEntries && <span className="sp-count">{db.entries.length}</span>}
            </button>
            <button className={`sp-subtab ${subTab === 'notas' ? 'active' : ''}`} onClick={() => setSubTab('notas')}>
              NOTAS
            </button>
          </div>

          {subTab === 'transcricao' && (
            <div className="sp-transcript-area" ref={transcriptRef}>
              {!hasEntries && !isLive && (
                <div className="sp-placeholder">
                  <div className="sp-placeholder-card">
                    {isMeetActive
                      ? 'Ative o CC no Google Meet para começar a transcrever automaticamente.'
                      : 'Comece a gravar para ver a transcrição aqui.'
                    }
                  </div>
                </div>
              )}

              {db.entries.map((entry, idx) => (
                <div key={entry.id ?? idx} className="sp-entry fade-in">
                  <div className="sp-entry-meta">
                    {entry.speaker && (
                      <span className="sp-entry-speaker">{entry.speaker}</span>
                    )}
                    <span className="sp-entry-time">{formatTime(entry.timestamp)}</span>
                  </div>
                  <p className="sp-entry-text">{entry.text}</p>
                </div>
              ))}

              {isCapturing && (
                <div className={`sp-live-entry ${isSpeaking ? 'speaking' : ''}`}>
                  <span className={`sp-live-dot ${isSpeaking ? 'active' : ''}`} />
                  <p className="sp-live-text">{transcript || 'Aguardando fala...'}</p>
                </div>
              )}
            </div>
          )}

          {subTab === 'notas' && (
            <div className="sp-notes-area">
              <textarea
                className="sp-notes-input"
                placeholder="Anote pontos importantes durante a reunião..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              {notes && (
                <button className="sp-notes-copy" onClick={() => navigator.clipboard.writeText(notes)}>
                  Copiar notas
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── AI tab ── */}
      {tab === 'ai' && <AIChat entries={db.entries} />}

      {/* ── Bottom bar ── */}
      <div className="sp-bottombar">
        <div className="sp-bottombar-left">
          <span className="sp-status-mini">{statusLabel}</span>
        </div>

        <div className="sp-bottombar-actions">
          <button
            className="sp-bottom-btn"
            onClick={() => {
              const text = db.entries
                .map(e => `[${formatTime(e.timestamp)}]${e.speaker ? ` ${e.speaker}:` : ''} ${e.text}`)
                .join('\n')
              navigator.clipboard.writeText(text)
            }}
            title="Copiar transcrição" disabled={!hasEntries}
          ><Copy size={14} strokeWidth={2} /></button>

          <button
            className="sp-bottom-btn"
            onClick={() => db.exportTXT(db.currentSession, db.entries)}
            title="Exportar TXT" disabled={!hasEntries}
          ><Download size={14} strokeWidth={2} /></button>

          {!isCCActive && (
            <button
              className={`sp-record-btn ${isCapturing ? 'recording' : ''}`}
              onClick={handleToggle}
              title={isCapturing ? 'Parar gravação' : 'Iniciar gravação por áudio'}
            >
              {isCapturing ? <Square size={14} strokeWidth={0} fill="currentColor" /> : <Mic size={16} strokeWidth={2} />}
            </button>
          )}

          {isCCActive && db.currentSession && (
            <button
              className="sp-record-btn recording"
              onClick={() => setShowFinishModal(true)}
              title="Encerrar sessão"
            >
              <Square size={14} strokeWidth={0} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {showFinishModal && (
        <Modal
          title="Encerrar sessão"
          message="Deseja encerrar a sessão atual? A transcrição ficará salva no histórico."
          confirmLabel="Encerrar"
          cancelLabel="Cancelar"
          onConfirm={() => { db.finishSession(); sessionStartedRef.current = false; setShowFinishModal(false) }}
          onCancel={() => setShowFinishModal(false)}
        />
      )}
      {showHistory && (
        <Sessions
          sessions={db.sessions}
          currentSession={db.currentSession}
          viewSession={db.viewSession}
          viewEntries={db.viewEntries}
          loading={db.loading}
          onOpen={db.openSessionView}
          onClose={() => { db.closeSessionView(); setShowHistory(false) }}
          onDelete={db.removeSession}
          onExportJSON={db.exportJSON}
          onExportTXT={db.exportTXT}
        />
      )}
    </div>
  )
}
