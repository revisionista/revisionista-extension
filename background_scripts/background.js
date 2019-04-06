let fetchRetry = require('fetch-retry');
let cache = {};

const MEMENTOWEB_URL = "http://labs.mementoweb.org/timemap/link/";
const ARQUIVO_PT_URL = "https://arquivo.pt/wayback/timemap/*/";

function logTabs(tabs) {
  for (let tab of tabs) {
    executeScripts(
      tab.id,
      [
        {file: "/vendor/diff_match_patch_uncompressed.js"},
        {file: "/vendor/diff_match_patch_extras.js"},
        {file: "/vendor/Readability.js"},
        {file: "/content_scripts/viewer.js"}
      ]
    ).then(() => {
      console.log(`fetchHtml in the background for ${tab.url}`);
      if (tab.url in cache) {
        let earliest = cache[tab.url];
        fetchReplay(earliest.replayUrl, earliest.datetime);
      }
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

browser.tabs.onCreated.addListener(() => {
  browser.browserAction.disable();
});

function onReaderable(request, sender) {
  fetchTimemap(sender.tab);
}

/**
 * Add a listener on the browser messages.
 */
function handleMessage(request, sender, sendResponse) {
  sendResponse({response: `received cmd ${request.cmd}`});
  if (request.cmd === 'probablyReaderable') {
    onReaderable(request, sender);
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

function fetchTimemap(tab) {
  let timemapUrl = ARQUIVO_PT_URL + `${tab.url}`;
  console.log(`timemap ${timemapUrl}`);

  fetchRetry(timemapUrl, {
    retries: 3,
    retryDelay: 1000,
    retryOn: [500, 502, 503, 504]
  }).then((response) => {
    if (response.ok) {
      return response.text();
    }
    throw new Error('Network response was not ok.');
  }).then((links) => {
    let entries = parseMemento(links);
    if (entries.length > 0) {
      let earliest = {
        replayUrl: replayUrlSubstitutions(entries[0].url),
        datetime: entries[0].datetime
      };
      cache[tab.url] = earliest;
      console.log(`replay ${earliest.replayUrl} ${earliest.datetime}`);
      browser.browserAction.enable(tab.id);
      browser.browserAction.setBadgeText({
        tabId: tab.id,
        text: entries.length.toString()
      });
    }
  }).catch((error) => {
    console.log('There has been a problem with your fetch operation: ', error.message);
  });
}

function fetchReplay(replayUrl, datetime) {
  fetchRetry(replayUrl, {
    retries: 3,
    retryDelay: 1000,
    retryOn: [500, 502, 503, 504]
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
    let tabId = tabs[0].id;
    let sending = browser.tabs.sendMessage(tabId, message);
    sending.then(handleResponse, handleError);
    browser.browserAction.setIcon({
      tabId: tabId,
      path: "revisionist_extension_on.png"
    });
  });
}
