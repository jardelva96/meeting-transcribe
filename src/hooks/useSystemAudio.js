import { useState, useRef, useCallback, useEffect } from 'react'
import hark from 'hark'
import { transcribeAudio } from '../services/groq'

const MAX_CHUNK_DURATION = 30000
const MIN_SPEECH_DURATION = 800
const SILENCE_THRESHOLD = 1500
const NOISE_WORDS = new Set([
  'you', 'thank you.', 'thanks for watching!', 'bye.',
  'the end.', 'thanks for watching.', 'subtitle by',
])
const MIC_CHECK_INTERVAL = 100
const SPEAKING_THRESHOLD = 15
const SPEAKING_RATIO_LIMIT = 0.3

function isExtension() {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}

export function useSystemAudio({ onTranscription } = {}) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  const fullStreamRef = useRef(null)
  const recorderRef = useRef(null)
  const isCapturingRef = useRef(false)
  const chunksRef = useRef([])

  const micStreamRef = useRef(null)
  const micCheckIntervalRef = useRef(null)
  const speakingFramesRef = useRef(0)
  const totalFramesRef = useRef(0)
  const micAnalyserRef = useRef(null)
  const micAudioContextRef = useRef(null)

  const harkRef = useRef(null)
  const speechStartTimeRef = useRef(null)
  const maxChunkTimerRef = useRef(null)
  const mimeTypeRef = useRef('audio/webm')

  const levelIntervalRef = useRef(null)
  const sysAnalyserRef = useRef(null)
  const sysAudioContextRef = useRef(null)

  const stopRecorder = useCallback(() => {
    if (maxChunkTimerRef.current) { clearTimeout(maxChunkTimerRef.current); maxChunkTimerRef.current = null }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      try { recorderRef.current.stop() } catch {}
    }
  }, [])

  const startRecorder = useCallback((stream) => {
    if (!isCapturingRef.current) return
    chunksRef.current = []
    speechStartTimeRef.current = Date.now()
    speakingFramesRef.current = 0
    totalFramesRef.current = 0

    const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      const duration = Date.now() - (speechStartTimeRef.current || 0)
      const ratio = totalFramesRef.current > 0 ? speakingFramesRef.current / totalFramesRef.current : 0
      if (chunksRef.current.length === 0 || duration < MIN_SPEECH_DURATION) return
      if (ratio > SPEAKING_RATIO_LIMIT) return
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
      if (blob.size < 1000) return
      try {
        const text = await transcribeAudio(blob)
        const trimmed = text.trim()
        if (!trimmed || trimmed.length <= 3) return
        if (NOISE_WORDS.has(trimmed.toLowerCase())) return
        setTranscript(trimmed)
        if (onTranscription) onTranscription(trimmed)
      } catch (err) {
        console.error('Erro na transcrição:', err)
      }
    }
    recorder.start()
    recorderRef.current = recorder
    maxChunkTimerRef.current = setTimeout(stopRecorder, MAX_CHUNK_DURATION)
  }, [onTranscription, stopRecorder])

  const setupHark = useCallback((stream) => {
    const ev = hark(stream, { threshold: -70, interval: 50, history: 10, play: false })
    ev.on('speaking', () => {
      if (!isCapturingRef.current) return
      setIsSpeaking(true)
      if (!recorderRef.current || recorderRef.current.state !== 'recording') startRecorder(stream)
    })
    ev.on('stopped_speaking', () => {
      setIsSpeaking(false)
      setTimeout(stopRecorder, SILENCE_THRESHOLD)
    })
    harkRef.current = ev
  }, [startRecorder, stopRecorder])

  const setupAudioLevel = useCallback((stream) => {
    try {
      const ctx = new AudioContext()
      sysAudioContextRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 256; an.smoothingTimeConstant = 0.6
      src.connect(an)
      sysAnalyserRef.current = an
      const data = new Uint8Array(an.frequencyBinCount)
      levelIntervalRef.current = setInterval(() => {
        if (!sysAnalyserRef.current) return
        sysAnalyserRef.current.getByteFrequencyData(data)
        setAudioLevel(Math.min(100, (data.reduce((a, b) => a + b, 0) / data.length / 40) * 100))
      }, 60)
    } catch {}
  }, [])

  const setupMicMonitor = useCallback(async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = micStream
      const ctx = new AudioContext()
      micAudioContextRef.current = ctx
      const src = ctx.createMediaStreamSource(micStream)
      const an = ctx.createAnalyser()
      an.fftSize = 512; an.smoothingTimeConstant = 0.3
      src.connect(an)
      micAnalyserRef.current = an
      const data = new Uint8Array(an.frequencyBinCount)
      micCheckIntervalRef.current = setInterval(() => {
        if (!micAnalyserRef.current) return
        micAnalyserRef.current.getByteFrequencyData(data)
        totalFramesRef.current++
        if (data.reduce((a, b) => a + b, 0) / data.length > SPEAKING_THRESHOLD) speakingFramesRef.current++
      }, MIC_CHECK_INTERVAL)
    } catch { console.warn('Microfone não disponível — filtro de voz desativado') }
  }, [])

  const initWithStream = useCallback(async (audioStream) => {
    mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm'
    setIsCapturing(true)
    isCapturingRef.current = true
    await setupMicMonitor()
    setupHark(audioStream)
    setupAudioLevel(audioStream)
  }, [setupMicMonitor, setupHark, setupAudioLevel])

  const stopCapture = useCallback(() => {
    isCapturingRef.current = false
    setIsCapturing(false); setIsSpeaking(false); setAudioLevel(0)
    if (harkRef.current) { harkRef.current.stop(); harkRef.current = null }
    stopRecorder()
    ;[levelIntervalRef, micCheckIntervalRef].forEach(r => { if (r.current) { clearInterval(r.current); r.current = null } })
    ;[sysAudioContextRef, micAudioContextRef].forEach(r => { if (r.current) { r.current.close(); r.current = null } })
    sysAnalyserRef.current = null; micAnalyserRef.current = null
    ;[micStreamRef, fullStreamRef].forEach(r => { if (r.current) { r.current.getTracks().forEach(t => t.stop()); r.current = null } })
  }, [stopRecorder])

  // Captura via chrome.tabCapture chamado DIRETAMENTE do side panel
  const startCaptureExtension = useCallback(async () => {
    setError(null); setTranscript('')
    try {
      const tabs = await new Promise(resolve =>
        chrome.tabs.query({ active: true, currentWindow: true }, resolve)
      )
      if (!tabs[0]) throw new Error('Nenhuma aba ativa encontrada.')

      const streamId = await new Promise((resolve, reject) =>
        chrome.tabCapture.getMediaStreamId({ targetTabId: tabs[0].id }, (id) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
          else resolve(id)
        })
      )

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId,
          },
        },
        video: false,
      })

      fullStreamRef.current = stream
      stream.getAudioTracks()[0].onended = () => stopCapture()
      await initWithStream(stream)
    } catch (err) {
      setError(err.message)
    }
  }, [initWithStream, stopCapture])

  // Captura via getDisplayMedia (modo web/dev)
  const startCaptureWeb = useCallback(async () => {
    setError(null); setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop())
        throw new Error('Nenhum áudio capturado. Ative "Also share tab audio".')
      }
      const audioStream = new MediaStream(audioTracks)
      stream.getVideoTracks().forEach(t => t.stop())
      fullStreamRef.current = stream
      audioTracks[0].onended = () => stopCapture()
      await initWithStream(audioStream)
    } catch (err) {
      if (err.name !== 'NotAllowedError') setError(err.message)
    }
  }, [initWithStream, stopCapture])

  const startCapture = useCallback(() => {
    if (isExtension()) return startCaptureExtension()
    return startCaptureWeb()
  }, [startCaptureExtension, startCaptureWeb])

  // Ouve atalho de teclado vindo do service worker
  useEffect(() => {
    if (!isExtension()) return
    const handler = (message) => {
      if (message.type === 'TOGGLE_CAPTURE') {
        if (isCapturingRef.current) stopCapture()
        else startCapture()
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [startCapture, stopCapture])

  useEffect(() => {
    return () => {
      isCapturingRef.current = false
      if (harkRef.current) harkRef.current.stop()
      if (maxChunkTimerRef.current) clearTimeout(maxChunkTimerRef.current)
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current)
      if (micCheckIntervalRef.current) clearInterval(micCheckIntervalRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') { try { recorderRef.current.stop() } catch {} }
      ;[fullStreamRef, micStreamRef].forEach(r => { if (r.current) r.current.getTracks().forEach(t => t.stop()) })
      ;[sysAudioContextRef, micAudioContextRef].forEach(r => { if (r.current) r.current.close() })
    }
  }, [])

  return { isCapturing, transcript, startCapture, stopCapture, error, isSpeaking, audioLevel }
}
