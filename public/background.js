chrome.webRequest.onCompleted.addListener(
  async function (details) {
    const tabId = details.tabId;
    console.log('Tab ID', tabId);
    console.log('Details URL', details.url);
    const url = new URL(details.url);
    console.log('URL', url.href);

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

    console.log('Match', match);
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
    }
  },
  { urls: ['*://solana.fm/*', '*://solscan.io/*'] }
);
