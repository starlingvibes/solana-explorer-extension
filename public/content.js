// This script runs in the context of the webpage to scrape data if required
const scrapeData = () => {
  let data = null;

  if (data) {
    chrome.runtime.sendMessage({ action: 'scrapeData', data });
  }
};

scrapeData();
