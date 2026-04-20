// content-script.js — injeta no Google Meet e lê CC em tempo real
'use strict'

// ── Seletores conhecidos do Google Meet CC ────────────────────────────────
// O Meet muda classes frequentemente, jsnames são mais estáveis
const CAPTION_CONTAINER = [
  '[jsname="YSxPC"]',       // 2024-2025 (mais comum)
  '[jsname="K4s0lb"]',      // alternativo
  '.a4cQT',                 // classe antiga
  '[data-use-tile-style="2"] [jsname]', // fallback genérico
]

const CAPTION_ITEM = [
  '[jsname="N3NB2"]',
  '.TBMuR',
  '.bj8oCb',
]

const CAPTION_SPEAKER = [
  '[jsname="B1oKd"]',
  '.zs7s8d',
  '.NWpY1d',
  '.KcIKyf',
]

const CAPTION_TEXT = [
  '[jsname="tgaKEf"]',
  '.CNuSmb',
  '.bj8oCb span:not([jsname="B1oKd"])',
]

// ── Helpers ───────────────────────────────────────────────────────────────
function qs(selectors, parent = document) {
  for (const s of selectors) {
    try {
      const el = parent.querySelector(s)
      if (el) return el
    } catch {}
  }
  return null
}

function qsa(selectors, parent = document) {
  for (const s of selectors) {
    try {
      const els = parent.querySelectorAll(s)
      if (els.length > 0) return [...els]
    } catch {}
  }
  return []
}

// ── Estado ────────────────────────────────────────────────────────────────
let lastText = ''
let lastSpeaker = ''
let debounceTimer = null
let maxDurationTimer = null
let observer = null
let containerEl = null
let scanInterval = null

// ── Emite caption finalizada ──────────────────────────────────────────────
function emit(speaker, text) {
  const t = text?.trim()
  if (!t || t.length < 3) return
  if (t === lastText && speaker === lastSpeaker) return

  lastText = t
  lastSpeaker = speaker

  chrome.storage.session.set({
    meetCaption: { speaker: speaker || '', text: t, timestamp: Date.now() },
  })
}

// ── Lê o estado atual do CC ───────────────────────────────────────────────
function readCaption(container) {
  // Tenta ler por itens individuais (com speaker + texto separados)
  const items = qsa(CAPTION_ITEM, container)
  if (items.length > 0) {
    const last = items[items.length - 1]
    const speakerEl = qs(CAPTION_SPEAKER, last)
    const textEl    = qs(CAPTION_TEXT, last)

    const speaker = speakerEl?.textContent?.trim() ?? ''
    // Se não encontrou seletor específico, pega tudo exceto o nome do speaker
    let text = textEl?.textContent?.trim()
    if (!text) {
      const allText = last.textContent?.trim() ?? ''
      text = speaker ? allText.replace(speaker, '').trim() : allText
    }
    if (text) scheduleEmit(speaker, text)
    return
  }

  // Fallback: lê texto bruto do container
  // Tenta separar "NomeSpeaker: texto"
  const raw = container.textContent?.trim()
  if (!raw) return

  const colonIdx = raw.indexOf(':')
  if (colonIdx > 0 && colonIdx < 40) {
    const speaker = raw.slice(0, colonIdx).trim()
    const text    = raw.slice(colonIdx + 1).trim()
    if (text) scheduleEmit(speaker, text)
  } else {
    scheduleEmit('', raw)
  }
}

// ── Debounce: emite após 1.5s sem mudança (fala pausou) ───────────────────
function scheduleEmit(speaker, text) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => emit(speaker, text), 1500)

  // Força emissão após 25s (fala longa sem pausa)
  if (!maxDurationTimer) {
    maxDurationTimer = setTimeout(() => {
      emit(speaker, text)
      maxDurationTimer = null
    }, 25000)
  }
}

// ── Observa o container de CC ─────────────────────────────────────────────
function attachObserver(container) {
  if (observer) observer.disconnect()

  observer = new MutationObserver(() => readCaption(container))
  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  // Sinal de que CC está ativo
  chrome.storage.session.set({ meetCCActive: true })
}

// ── Varre o DOM buscando o container de CC ────────────────────────────────
function scanForContainer() {
  // Tenta seletores conhecidos
  let el = qs(CAPTION_CONTAINER)
  if (el) {
    containerEl = el
    attachObserver(el)
    clearInterval(scanInterval)
    return
  }

  // Fallback: procura elemento aria-live na metade inferior da tela
  const live = [...document.querySelectorAll('[aria-live]')]
  const bottom = live.find(e => {
    try {
      const r = e.getBoundingClientRect()
      return r.top > window.innerHeight * 0.4 && e.textContent?.trim().length > 0
    } catch { return false }
  })
  if (bottom) {
    containerEl = bottom
    attachObserver(bottom)
    clearInterval(scanInterval)
  }
}

// ── Lê título da reunião ──────────────────────────────────────────────────
function getMeetingInfo() {
  // Tenta vários seletores para o título
  const titleSelectors = [
    '[data-meeting-title]',
    '.u6vdEc',
    '[jsname="r4nke"]',
    '.rG0ybd',           // nome da sala
    '[jsname="x3vTId"]',
  ]
  const titleEl = qs(titleSelectors)
  const title = titleEl?.textContent?.trim()
    || document.title.replace(/ [-–|] Google Meet.*$/i, '').trim()
    || 'Google Meet'

  chrome.storage.session.set({
    meetInfo: { title, url: window.location.href, active: true },
  })
}

// ── Observa o botão CC para saber quando ativado/desativado ──────────────
function watchCCButton() {
  const btnObs = new MutationObserver(() => {
    // Se o container sumiu, desmarca CC como ativo
    if (containerEl && !document.contains(containerEl)) {
      containerEl = null
      if (observer) { observer.disconnect(); observer = null }
      chrome.storage.session.set({ meetCCActive: false })
      // Reinicia scan
      scanInterval = setInterval(scanForContainer, 2000)
    }
  })
  btnObs.observe(document.body, { childList: true, subtree: false })
}

// ── Init ──────────────────────────────────────────────────────────────────
;(function init() {
  getMeetingInfo()
  setTimeout(getMeetingInfo, 3000) // segunda tentativa após carregamento

  // Começa a varrer imediatamente e a cada 2s até encontrar
  scanForContainer()
  scanInterval = setInterval(scanForContainer, 2000)

  watchCCButton()

  // Limpa ao sair da página
  window.addEventListener('beforeunload', () => {
    chrome.storage.session.set({ meetInfo: { active: false }, meetCCActive: false })
  })
})()
