// Abre o side panel quando o ícone é clicado
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId })
})

// Atalhos de teclado
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-panel') {
    chrome.sidePanel.open({ windowId: tab.windowId })
  }

  if (command === 'toggle-capture') {
    // Repassa para o side panel que está ouvindo
    chrome.runtime.sendMessage({ type: 'TOGGLE_CAPTURE' }).catch(() => {
      // Side panel pode não estar aberto — abre primeiro
      chrome.sidePanel.open({ windowId: tab.windowId })
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Side panel pede stream ID da aba ativa
  if (message.type === 'GET_TAB_STREAM_ID') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { sendResponse({ error: 'Nenhuma aba ativa.' }); return }
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabs[0].id }, (streamId) => {
        if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message })
        else sendResponse({ streamId })
      })
    })
    return true
  }

  // Popup pede para abrir side panel
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.windows.getCurrent((win) => {
      chrome.sidePanel.open({ windowId: win.id })
      sendResponse({ ok: true })
    })
    return true
  }
})
