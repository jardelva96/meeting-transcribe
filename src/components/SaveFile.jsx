import { useState } from 'react'

function elapsed(start) {
  if (!start) return '0s'
  const ms = Date.now() - start
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

export default function SaveFile({ currentSession, onStart, onEnd }) {
  const [name, setName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleStart = () => {
    onStart(name.trim() || undefined)
    setName('')
    setShowInput(false)
  }

  if (currentSession) {
    return (
      <div className="session-bar active">
        <div className="session-bar-left">
          <span className="save-dot save-dot-active" />
          <div>
            <span className="session-bar-name">{currentSession.name}</span>
            <span className="session-bar-elapsed"> &bull; {elapsed(currentSession.startedAt)}</span>
          </div>
        </div>
        <button className="save-btn save-btn-stop" onClick={onEnd}>
          Encerrar sessão
        </button>
      </div>
    )
  }

  return (
    <div className="session-bar">
      <div className="session-bar-left">
        <span className="save-dot" />
        <span className="save-idle">Nenhuma sessão ativa</span>
      </div>
      <div className="session-bar-right">
        {showInput ? (
          <>
            <input
              className="session-name-input"
              type="text"
              placeholder="Nome da reunião (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              autoFocus
            />
            <button className="save-btn save-btn-open" onClick={handleStart}>Iniciar</button>
            <button className="save-btn save-btn-cancel" onClick={() => setShowInput(false)}>✕</button>
          </>
        ) : (
          <button className="save-btn save-btn-open" onClick={() => setShowInput(true)}>
            Nova sessão
          </button>
        )}
      </div>
    </div>
  )
}
