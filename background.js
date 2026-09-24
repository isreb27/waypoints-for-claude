// Waypoints background: the toolbar icon opens or closes the panel on claude.ai.

chrome.action.onClicked.addListener(async tab => {
  if (tab.url && /^https:\/\/claude\.ai\//.test(tab.url)) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'waypoints:toggle' });
    } catch {
      // The page was open before Waypoints was installed or updated: reload it.
      chrome.tabs.reload(tab.id);
    }
  } else {
    chrome.tabs.create({ url: 'https://claude.ai/' });
  }
});
