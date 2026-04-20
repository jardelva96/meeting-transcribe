import { useState, useEffect, useRef, useCallback } from 'react'

function isExtension() {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}

/**
 * Hook que consome as legendas enviadas pelo content-script via chrome.storage.session.
 * Funciona em paralelo com useSystemAudio — quando o CC do Meet está ativo,
 * as captions chegam por aqui (com speaker label, sem delay de Whisper).
 */
export function useMeetCaption({ onCaption } = {}) {
  const [isMeetActive, setIsMeetActive] = useState(false)
  const [isCCActive, setIsCCActive] = useState(false)
  const [meetTitle, setMeetTitle] = useState('')
  const onCaptionRef = useRef(onCaption)

  useEffect(() => { onCaptionRef.current = onCaption }, [onCaption])

  useEffect(() => {
    if (!isExtension() || !chrome.storage?.session) return

    // Lê estado inicial
    chrome.storage.session.get(['meetInfo', 'meetCCActive'], (result) => {
      if (result.meetInfo?.active) {
        setIsMeetActive(true)
        setMeetTitle(result.meetInfo.title || '')
      }
      setIsCCActive(!!result.meetCCActive)
    })

    // Escuta mudanças em tempo real
    const handler = (changes, area) => {
      if (area !== 'session') return

      if (changes.meetInfo) {
        const info = changes.meetInfo.newValue
        setIsMeetActive(!!info?.active)
        setMeetTitle(info?.title ?? '')
      }

      if (changes.meetCCActive) {
        setIsCCActive(!!changes.meetCCActive.newValue)
      }

      if (changes.meetCaption) {
        const cap = changes.meetCaption.newValue
        if (cap?.text) {
          onCaptionRef.current?.(cap)
        }
      }
    }

    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [])

  return { isMeetActive, isCCActive, meetTitle }
}
