import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { getAISettings, saveAISettings, PROVIDER_OPTIONS } from '../services/ai'

export default function Settings({ onClose }) {
  const [provider, setProvider] = useState('openai')
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const s = getAISettings()
    setProvider(s.provider)
    setToken(s.token)
  }, [])

  const handleSave = () => {
    saveAISettings({ provider, token })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Configurações de IA</p>
            <p className="modal-meta">Sua chave fica salva apenas no navegador</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-field">
            <label className="settings-label">Provedor</label>
            <div className="provider-grid">
              {PROVIDER_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  className={`provider-btn ${provider === p.id ? 'active' : ''}`}
                  onClick={() => setProvider(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label">Chave de API</label>
            <div className="token-input-wrap">
              <input
                type={show ? 'text' : 'password'}
                className="token-input"
                placeholder={provider === 'openai' ? 'sk-...' : 'gsk_...'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
              <button className="token-toggle" onClick={() => setShow((s) => !s)}>
                {show ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="settings-hint">
              {provider === 'openai'
                ? 'Crie sua chave em platform.openai.com/api-keys'
                : 'Crie sua chave em console.groq.com/keys'}
            </p>
          </div>

          <div className="settings-footer">
            <button className="save-btn save-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              className={`save-btn settings-save-btn ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={!token.trim()}
            >
              {saved ? <><Check size={13} strokeWidth={2.5} /> Salvo</> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
