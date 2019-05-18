const tldjs = require('tldjs');
const fetchRetry = require('fetch-retry');

const TITLE_DEFAULT = "Revisionista";
const TITLE_OPENED = "Revisionista X";
const FIREFOX_DEFAULT_BADGE_COLOR = "rgb(217,0,0)";
const CHROME_DEFAULT_BADGE_COLOR = "rgb(89,124,242)";
const MEMENTOWEB_URL = "http://labs.mementoweb.org/timemap/link/";
const ARQUIVO_PT_URL = "https://arquivo.pt/wayback/timemap/*/";
const NOTIFY_ON_TLDS = new Set(['pt']);

let cache = {};

function logTabs(tabs) {
  for (let tab of tabs) {
    browser.browserAction.getTitle({
      tabId: tab.id
    }).then((title) => {
      // bail if the viewer is already opened
      if (title != 'Revisionista') return;
      if (tab.url in cache) {
        executeScripts(
          tab.id,
          [
            {file: "/vendor/diff_match_patch_uncompressed.js"},
            {file: "/vendor/diff_match_patch_extras.js"},
            {file: "/vendor/Readability.js"},
            {file: "/content_scripts/viewer.js"}
          ]
        ).then(() => {
          console.log(`fetchReplay in the background for ${tab.url}`);
          let earliest = cache[tab.url];
          fetchReplay(earliest.replayUrl, earliest.datetime);
        });
      } else {
        fetchTimemap(tab);
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
  browser.browserAction.setTitle({
    title: TITLE_DEFAULT
  });
  // For consistent color in any browser.
  browser.browserAction.setBadgeBackgroundColor({
    color: FIREFOX_DEFAULT_BADGE_COLOR
  });
});

function onReaderable(request, sender) {
  let tab = sender.tab;
  browser.browserAction.enable(tab.id);

  let tld = tldjs.getPublicSuffix(tab.url);
  if (NOTIFY_ON_TLDS.has(tld)) {
    fetchTimemap(tab);
  }
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
    browser.browserAction.setTitle({
      tabId: tabId,
      title: TITLE_OPENED
    });
    browser.browserAction.setIcon({
      tabId: tabId,
      path: {
        16: "icons/on_icon16.png",
        19: "icons/on_icon19.png",
        32: "icons/on_icon32.png",
        38: "icons/on_icon38.png",
        48: "icons/on_icon48.png",
        128: "icons/on_icon128.png"
      }
    });
    browser.browserAction.setBadgeBackgroundColor({
      tabId: tabId,
      color: FIREFOX_DEFAULT_BADGE_COLOR
    });
  });
}
