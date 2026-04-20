import { useEffect, useState } from 'react'
import { Mic, ExternalLink } from 'lucide-react'

export default function Popup() {
  const [opening, setOpening] = useState(false)

  useEffect(() => { handleOpen() }, [])

  const handleOpen = () => {
    setOpening(true)
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => { window.close() })
  }

  return (
    <div style={{
      width: 260,
      padding: '20px 18px',
      background: '#080810',
      color: '#e4e4f0',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mic size={20} strokeWidth={1.8} color="#6366f1" />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
          Meeting Transcribe
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#52526e', textAlign: 'center', lineHeight: 1.5 }}>
        {opening ? 'Abrindo painel lateral...' : 'Clique para iniciar'}
      </p>

      <button
        onClick={handleOpen}
        style={{
          width: '100%',
          padding: '10px',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 8,
          color: '#818cf8',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: 0.3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        Abrir Painel Lateral <ExternalLink size={12} strokeWidth={2} />
      </button>
    </div>
  )
}
