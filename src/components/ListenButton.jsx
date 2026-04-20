export default function ListenButton({ isListening, onStart, onStop }) {
  return (
    <button
      className={`listen-btn ${isListening ? 'active' : ''}`}
      onClick={isListening ? onStop : onStart}
      aria-label={isListening ? 'Parar captura' : 'Iniciar captura'}
    >
      <span className="listen-btn-icon">
        {isListening ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        )}
      </span>
      <span className="listen-btn-label">
        {isListening ? 'Parar' : 'Iniciar'}
      </span>
    </button>
  )
}
