const DB_NAME = 'meeting_transcribe'
const DB_VERSION = 1
const STORE_SESSIONS = 'sessions'
const STORE_ENTRIES = 'entries'

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessions = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' })
        sessions.createIndex('startedAt', 'startedAt')
      }

      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const entries = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id', autoIncrement: true })
        entries.createIndex('sessionId', 'sessionId')
        entries.createIndex('timestamp', 'timestamp')
      }
    }

    req.onsuccess = (e) => {
      _db = e.target.result
      resolve(_db)
    }

    req.onerror = () => reject(req.error)
  })
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => {
    const t = db.transaction(storeName, mode)
    return t.objectStore(storeName)
  })
}

function promisify(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result)
    req.onerror  = () => rej(req.error)
  })
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(name = '') {
  const store = await tx(STORE_SESSIONS, 'readwrite')
  const session = {
    id: `sess_${Date.now()}`,
    name: name || `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
    startedAt: Date.now(),
    endedAt: null,
    totalEntries: 0,
  }
  await promisify(store.put(session))
  return session
}

export async function endSession(sessionId) {
  const store = await tx(STORE_SESSIONS, 'readwrite')
  const session = await promisify(store.get(sessionId))
  if (!session) return
  session.endedAt = Date.now()
  await promisify(store.put(session))
}

export async function updateSessionCount(sessionId, count) {
  const store = await tx(STORE_SESSIONS, 'readwrite')
  const session = await promisify(store.get(sessionId))
  if (!session) return
  session.totalEntries = count
  await promisify(store.put(session))
}

export async function getAllSessions() {
  const store = await tx(STORE_SESSIONS)
  return new Promise((res, rej) => {
    const req = store.index('startedAt').openCursor(null, 'prev')
    const results = []
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) { results.push(cursor.value); cursor.continue() }
      else res(results)
    }
    req.onerror = () => rej(req.error)
  })
}

export async function deleteSession(sessionId) {
  const entriesStore = await tx(STORE_ENTRIES, 'readwrite')
  await new Promise((res, rej) => {
    const req = entriesStore.index('sessionId').openCursor(IDBKeyRange.only(sessionId))
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) { cursor.delete(); cursor.continue() }
      else res()
    }
    req.onerror = () => rej(req.error)
  })
  const sessStore = await tx(STORE_SESSIONS, 'readwrite')
  await promisify(sessStore.delete(sessionId))
}

// ── Entries ───────────────────────────────────────────────────────────────────

export async function addEntry(sessionId, entry) {
  const store = await tx(STORE_ENTRIES, 'readwrite')
  const record = { ...entry, sessionId }
  const id = await promisify(store.add(record))
  return { ...record, id }
}

export async function getEntriesBySession(sessionId) {
  const store = await tx(STORE_ENTRIES)
  return new Promise((res, rej) => {
    const req = store.index('sessionId').getAll(IDBKeyRange.only(sessionId))
    req.onsuccess = () => res(req.result.sort((a, b) => b.timestamp - a.timestamp))
    req.onerror  = () => rej(req.error)
  })
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportSessionAsJSON(session, entries) {
  const data = {
    reuniao: session.name,
    inicio: new Date(session.startedAt).toLocaleString('pt-BR'),
    fim: session.endedAt ? new Date(session.endedAt).toLocaleString('pt-BR') : 'Em andamento',
    total_segmentos: entries.length,
    transcricao: entries.map((e) => ({
      horario: new Date(e.timestamp).toLocaleTimeString('pt-BR'),
      texto: e.text,
    })),
  }
  return JSON.stringify(data, null, 2)
}

export async function exportSessionAsTXT(session, entries) {
  const lines = [
    `REUNIÃO: ${session.name}`,
    `Início: ${new Date(session.startedAt).toLocaleString('pt-BR')}`,
    `Total de segmentos: ${entries.length}`,
    '─'.repeat(60),
    '',
  ]
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)
  sorted.forEach((e) => {
    lines.push(`[${new Date(e.timestamp).toLocaleTimeString('pt-BR')}] ${e.text}`)
  })
  return lines.join('\n')
}

export function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
