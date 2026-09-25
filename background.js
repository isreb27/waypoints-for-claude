// Waypoints background: the toolbar icon opens or closes the panel on claude.ai.
// Chrome runs this file as a service worker and Firefox as an event page; the code is the same.

const CLAUDE_ORIGIN = 'https://claude.ai/*';
const CLAUDE_URL = /^https:\/\/claude\.ai\//;

chrome.action.onClicked.addListener(tab => {
  // First make sure Waypoints may run on claude.ai. Browsers let you take that access away
  // (Firefox: about:addons or the extensions menu), and then nothing would appear.
  // This must be the very first call in the click handler: Firefox only accepts permission
  // requests during the click itself. If access is already granted it resolves at once,
  // without showing anything.
  chrome.permissions.request({ origins: [CLAUDE_ORIGIN] })
    .then(granted => { if (granted) openOrToggle(tab.id); })
    .catch(() => openOrToggle(tab.id));
});

async function openOrToggle(tabId) {
  let tab;
  try {
    // Read the tab again: its address is hidden from Waypoints until claude.ai access is granted.
    tab = await chrome.tabs.get(tabId);
  } catch {
    return; // The tab was closed in the meantime.
  }
  if (!tab.url || !CLAUDE_URL.test(tab.url)) {
    chrome.tabs.create({ url: 'https://claude.ai/' });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'waypoints:toggle' });
  } catch {
    // Waypoints isn't running in this tab yet (the page was open before it was installed,
    // or before access was granted): reload it.
    chrome.tabs.reload(tab.id);
  }
}