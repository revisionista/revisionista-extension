let fetchRetry = require('fetch-retry');

let replayUrl;
let datetime;

function logResponseHeaders(requestDetails) {
  if (requestDetails.type == 'main_frame') {
    console.log(`fetchTimemap ${requestDetails.url}`);
    fetchTimemap(requestDetails);
  }
}

function startListening() {
  browser.webRequest.onCompleted.addListener(
    logResponseHeaders,
    {urls: ["<all_urls>"]},
    ["responseHeaders"]
  );
}

startListening();

function logTabs(tabs) {
  for (let tab of tabs) {
    executeScripts(
      tab.id,
      [
        {file: "/vendor/browser-polyfill.min.js"},
        {file: "/vendor/diff_match_patch_uncompressed.js"},
        {file: "/vendor/diff_match_patch_extras.js"},
        {file: "/vendor/Readability.js"},
        {file: "/content_scripts/content.js"}
      ]
    ).then(() => {
      console.log(`fetchHtml in the background for ${tab.url}`);
      fetchReplay(replayUrl, datetime);
    });
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

/**
 * Add a listener on the browser action.
 */
function onClicked() {
  let querying = browser.tabs.query({
    currentWindow: true,
    active: true
  });
  querying.then(logTabs, onError);
}

browser.browserAction.onClicked.addListener(onClicked);


/**
 * Add a listener on the browser messages.
 */
function handleMessage(request, sender, sendResponse) {
  if (request.cmd === 'cmd') {
    sendResponse({response: 'cmd in the background'});
  }
}

browser.runtime.onMessage.addListener(handleMessage);

/*
 * Parse the Memento response.
 */
function parseMemento(data) {
  if (data.length == 0) {
    throw new Error("input must not be of zero length");
  }

  let entries = [];
  let items = data.split('\n')
  items.forEach((item) => {
    let memento = item.split(';');
    if (memento.length < 2) {
      throw new Error("memento could not be split on ';'");
    }
    let url = memento[0].replace(/<(.*)>/, '$1').trim();
    let name = memento[1].replace(/rel="(.*)"/, '$1').trim();
    if (memento.length > 2 && name === "memento") {
      let datetime = memento[2].replace(/datetime="(.*)",/, '$1').trim();
      entries.push({'url': url, 'name': name, 'datetime': datetime});
    }
  });

  return entries;
}

function replayUrlSubstitutions(url) {
  let newUrl = url;
  newUrl.replace(
    "https://arquivo.pt/wayback/",
    "https://arquivo.pt/noFrame/replay/"
  );
  return newUrl;
}

function fetchTimemap(requestDetails) {
  // Using Memento Aggregator
  let timemapUrl = `http://labs.mementoweb.org/timemap/link/${requestDetails.url}`;
  console.log(`timemap ${timemapUrl}`);

  fetchRetry(timemapUrl, {
    retries: 3,
    retryDelay: 1000
  }).then((response) => {
    if (response.ok) {
      return response.text();
    }
    throw new Error('Network response was not ok.');
  }).then((links) => {
    let entries = parseMemento(links);
    if (entries.length > 0) {
      replayUrl = replayUrlSubstitutions(entries[0].url);
      datetime = entries[0].datetime;
      console.log(`replay ${replayUrl} ${datetime}`);
      browser.browserAction.setIcon({
        tabId: requestDetails.tabId,
        path: "revisionist_extension_on.png"
      });
    }
  }).catch((error) => {
    console.log('There has been a problem with your fetch operation: ', error.message);
  });
}

function fetchReplay(replayUrl, datetime) {
  fetchRetry(replayUrl, {
    retries: 3,
    retryDelay: 1000
  }).then((response) => {
    if (response.ok) {
      return response.text();
    }
    throw new Error('Network response was not ok.');
  }).then((textHtml) => {
    let p = new DOMParser();
    let doc = p.parseFromString(textHtml, 'text/html');
    let article = new Readability(doc).parse();

    notifyActiveTab({
      cmd: 'response-revisions',
      datetime,
      article
    });
  }).catch((error) => {
    console.log('There has been a problem with your fetch operation: ', error.message);
  });
}

function handleResponse(message) {
  console.log(`Message from the content script: ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function notifyActiveTab(message) {
  let querying = browser.tabs.query({
    currentWindow: true,
    active: true
  });
  querying.then((tabs) => {
    let sending = browser.tabs.sendMessage(tabs[0].id, message);
    sending.then(handleResponse, handleError);
  });
}
