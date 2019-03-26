function logTabs(tabs) {
  for (let tab of tabs) {
    executeScripts(
      tab.id,
      [
        { file: "/vendor/browser-polyfill.min.js" },
        { file: "/vendor/diff_match_patch.js" },
        { file: "/vendor/Readability.js" },
        { file: "/content_scripts/content.js" }
      ]
    ).then(() => {
      console.log(`fetch-revisions in the background for ${tab.url}`);
      fetch_revisions(tab.url);
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
  var querying = browser.tabs.query({
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
  if (request.cmd === 'fetch-revisions') {
    sendResponse({response: 'fetch-revisions in the background'});
    fetch_revisions(request);
  }
}
browser.runtime.onMessage.addListener(handleMessage);

/*
 * Parse the Memento response.
 */
function parse_memento(data) {
  if (data.length == 0) {
    throw new Error("input must not be of zero length");
  }

  var entries = [];
  var items = data.split('\n')
  items.forEach((item) => {
    var memento = item.split(';');
    if (memento.length < 2) {
      throw new Error("memento could not be split on ';'");
    }
    var url = memento[0].replace(/<(.*)>/, '$1').trim();
    var name = memento[1].replace(/rel="(.*)"/, '$1').trim();
    if (memento.length > 2 && name === "memento") {
      var datetime = memento[2].replace(/datetime="(.*)",/, '$1').trim();
      entries.push({'url': url, 'name': name, 'datetime': datetime});
    }
  });

  return entries;
}

function replay_substitutions(url) {
  let new_url = url;
  new_url.replace(
    "https://arquivo.pt/wayback/",
    "https://arquivo.pt/noFrame/replay/"
  );
  return new_url;
}

function fetch_revisions(url) {
  // Using Memento Aggregator
  var timemap_url = `http://labs.mementoweb.org/timemap/link/${url}`;
  console.log(`timemap ${timemap_url}`);

  fetch(timemap_url).then((response) => {
    if(response.ok) {
      return response.text();
    }
    throw new Error('Network response was not ok.');
  }).then((links) => {
    var entries = parse_memento(links);
    if (entries.length > 0) {
      var replay_url = replay_substitutions(entries[0].url);
      var datetime = entries[0].datetime;
      console.log(`replay ${datetime} ${replay_url}`);

      fetch(replay_url).then((response) => {
        if(response.ok) {
          return response.text();
        }
        throw new Error('Network response was not ok.');
      }).then((html_string) => {
        var p = new DOMParser();
        var doc = p.parseFromString(html_string, 'text/html');
        var article = new Readability(doc).parse();

        notifyActiveTab({
          cmd: 'response-revisions',
          datetime,
          article
        });
      }).catch((error) => {
        console.log('There has been a problem with your fetch operation: ', error.message);
      });
    }
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
  var querying = browser.tabs.query({
    currentWindow: true,
    active: true
  });
  querying.then((tabs) => {
    var sending = browser.tabs.sendMessage(tabs[0].id, message);
    sending.then(handleResponse, handleError);
  });
}
