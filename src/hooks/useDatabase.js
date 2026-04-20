import { useState, useRef, useCallback, useEffect } from 'react'
import {
  createSession, endSession, updateSessionCount,
  getAllSessions, deleteSession,
  addEntry, getEntriesBySession,
  exportSessionAsJSON, exportSessionAsTXT, downloadBlob,
} from '../services/db'

export function useDatabase() {
  const [currentSession, setCurrentSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const [entries, setEntries] = useState([])
  const [viewSession, setViewSession] = useState(null)
  const [viewEntries, setViewEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const entryCountRef = useRef(0)

  useEffect(() => {
    getAllSessions().then(setSessions).catch(console.error)
  }, [])

  const startSession = useCallback(async (name) => {
    const session = await createSession(name)
    setCurrentSession(session)
    setEntries([])
    entryCountRef.current = 0
    setSessions((prev) => [session, ...prev])
    return session
  }, [])

  const finishSession = useCallback(async () => {
    if (!currentSession) return
    await endSession(currentSession.id)
    const updated = { ...currentSession, endedAt: Date.now() }
    setCurrentSession(null)
    setSessions((prev) => prev.map((s) => s.id === updated.id ? updated : s))
    setEntries([])
    entryCountRef.current = 0
  }, [currentSession])

  const saveEntry = useCallback(async (entry) => {
    if (!currentSession) return

    const saved = await addEntry(currentSession.id, entry)
    entryCountRef.current += 1
    await updateSessionCount(currentSession.id, entryCountRef.current)

    setEntries((prev) => [saved, ...prev])
    setSessions((prev) =>
      prev.map((s) => s.id === currentSession.id
        ? { ...s, totalEntries: entryCountRef.current }
        : s
      )
    )
    return saved
  }, [currentSession])

  const openSessionView = useCallback(async (session) => {
    setLoading(true)
    setViewSession(session)
    const data = await getEntriesBySession(session.id)
    setViewEntries(data)
    setLoading(false)
  }, [])

  const closeSessionView = useCallback(() => {
    setViewSession(null)
    setViewEntries([])
  }, [])

  const removeSession = useCallback(async (sessionId) => {
    await deleteSession(sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (viewSession?.id === sessionId) closeSessionView()
  }, [viewSession, closeSessionView])

  const exportJSON = useCallback(async (session, entriesData) => {
    const content = await exportSessionAsJSON(session, entriesData)
    const slug = session.name.replace(/\s+/g, '_').toLowerCase()
    downloadBlob(content, `${slug}.json`, 'application/json')
  }, [])

  const exportTXT = useCallback(async (session, entriesData) => {
    const content = await exportSessionAsTXT(session, entriesData)
    const slug = session.name.replace(/\s+/g, '_').toLowerCase()
    downloadBlob(content, `${slug}.txt`, 'text/plain')
  }, [])

  return {
    currentSession,
    sessions,
    entries,
    viewSession,
    viewEntries,
    loading,
    startSession,
    finishSession,
    saveEntry,
    openSessionView,
    closeSessionView,
    removeSession,
    exportJSON,
    exportTXT,
  }
}
