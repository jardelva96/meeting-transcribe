export default function LiveTranscript({ transcript, isCapturing, isSpeaking, audioLevel }) {
  if (!isCapturing && !transcript) return null

  return (
    <div className={`card transcript-card ${isSpeaking ? 'speaking' : ''}`}>
      <div className="card-header">
        <span className={`dot ${isSpeaking ? 'dot-speaking' : 'dot-idle'}`} />
        <span>{isSpeaking ? 'Captando fala...' : 'Último segmento captado'}</span>
        {isCapturing && (
          <div className="level-bar-wrap">
            <div className="level-bar" style={{ width: `${audioLevel}%` }} />
          </div>
        )}
      </div>
      <p className="transcript-text">
        {transcript || <span className="muted">Aguardando fala...</span>}
      </p>
    </div>
  )
}
