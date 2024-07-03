chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const url = new URL(tab.url);

  // Check if the URL matches the Solana Explorer patterns
  const solscanAccountPattern = /solscan\.io\/account\/(.+)/;
  const solscanTxPattern = /solscan\.io\/tx\/(.+)/;
  const solanaFmAccountPattern = /solana\.fm\/address\/(.+)\/transactions/;
  const solanaFmTxPattern = /solana\.fm\/tx\/(.+)/;

  let match =
    url.href.match(solscanAccountPattern) ||
    url.href.match(solscanTxPattern) ||
    url.href.match(solanaFmAccountPattern) ||
    url.href.match(solanaFmTxPattern);

  if (match) {
    const data = {
      type: match[0],
      id: match[1],
    };
    if (match[0].includes('tx')) {
      const txHash = match[1];
      data.txHash = txHash;
    } else {
      const accountAddress = match[1];
      data.accountAddress = accountAddress;
    }

    // Store the details in local storage
    await chrome.storage.local.set({ solanaData: data });

    // Notify the popup
    chrome.action.setBadgeText({ text: '!' });
    chrome.runtime.sendMessage({ action: 'updateData' });
  }
});
