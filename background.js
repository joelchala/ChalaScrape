// ChalaScrape — service worker.
// El clic en el icono concede activeTab sobre esa pestaña y abre el panel lateral; si ya estaba
// abierto no lo cierra, así que un solo clic basta para darle acceso a otra pestaña.
// El comportamiento se guarda entre recargas: hay que apagar el "true" de versiones anteriores.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(console.error);

chrome.action.onClicked.addListener((tab) => {
  // open() exige el gesto del usuario: debe llamarse aquí mismo, sin ningún await antes.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  // activeTab se concede justo a esta pestaña: se anota para que el panel apunte a ella al cargar…
  chrome.storage.session.set({ clickedTab: tab.id });
  // …y si el panel ya estaba abierto, se le avisa directo (si aún no cargó, nadie escucha).
  chrome.runtime.sendMessage({ type: 'actionClicked', tabId: tab.id }).catch(() => {});
});

// Puente panel lateral → pestaña: { toTab: tabId, payload }.
// Los mensajes de la página hacia el panel (p. ej. nextPicked) llegan directo al panel.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.toTab) return;
  if (sender.tab) { // solo páginas de la extensión pueden pedir reenvíos, no un content script
    sendResponse({ error: 'origen no permitido' });
    return;
  }
  forward(msg.toTab, msg.payload).then(sendResponse, (e) => sendResponse({ error: e.message }));
  return true;
});

async function forward(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'ping' });
  } catch {
    // Sin content script (primera vez o tras navegar): se inyecta bajo demanda con activeTab.
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/overlay.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content/detector.js'] });
  }
  return chrome.tabs.sendMessage(tabId, payload);
}
