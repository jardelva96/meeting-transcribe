import { getAISettings } from './ai'

const WHISPER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/audio/transcriptions',
  groq:   'https://api.groq.com/openai/v1/audio/transcriptions',
}

const WHISPER_MODELS = {
  openai: 'whisper-1',
  groq:   'whisper-large-v3',
}

export async function transcribeAudio(audioBlob) {
  const { provider, token } = getAISettings()
  // localStorage primeiro (extensão), depois env var (dev local)
  const apiKey = token || import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Chave de API não configurada. Clique em ⚙ para inserir sua chave.')
  }

  const endpoint = WHISPER_ENDPOINTS[provider] ?? WHISPER_ENDPOINTS.groq
  const model    = WHISPER_MODELS[provider]    ?? WHISPER_MODELS.groq

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', model)
  formData.append('response_format', 'json')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Whisper error (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.text || ''
}
