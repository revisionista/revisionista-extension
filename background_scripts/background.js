function logTabs(tabs) {
  for (let tab of tabs) {
    executeScripts(
      tab.id,
      [
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
  console.log(request);
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
  items.forEach(function(item){
    var memento = item.split(';');
    if (memento.length < 2) {
      throw new Error("memento could not be split on ';'");
    }
    var url = memento[0].replace(/<(.*)>/, '$1').trim();
    var name = memento[1].replace(/rel="(.*)"/, '$1').trim();
    if (memento.length > 2 && name === "memento") {
      var datetime = memento[2].replace(/datetime="(.*)"/, '$1').trim();
      entries.push({'url': url, 'name': name, 'datetime': datetime});
    }
  });

  return entries;
}

function fetch_revisions(url) {
  var timemap_url = "https://arquivo.pt/wayback/timemap/*/" + url;
  console.log('timemap ' + timemap_url);

  fetch(timemap_url).then(function(response) {
    if(response.ok) {
      return response.text();
    }
    throw new Error('Network response was not ok.');
  }).then(function(links) {
    console.log('timemap done!');

    var entries = parse_memento(links);
    if (entries.length > 0) {
      var replay_url = entries[0].url.replace("https://arquivo.pt/wayback/", "https://arquivo.pt/noFrame/replay/");
      console.log('replay ' + replay_url);

      fetch(replay_url).then(function(response) {
        if(response.ok) {
          return response.text();
        }
        throw new Error('Network response was not ok.');
      }).then(function(html_string) {
        console.log('replay done!');

        var p = new DOMParser();
        var doc = p.parseFromString(html_string, 'text/html');
        console.log(`Readability start`);
        var article = new Readability(doc).parse();
        console.log(`Readability end`);

        notifyActiveTab({
          cmd: 'response-revisions',
          article
        });
      }).catch(function(error) {
        console.log('There has been a problem with your fetch operation: ', error.message);
      });
    }
  }).catch(function(error) {
    console.log('There has been a problem with your fetch operation: ', error.message);
  });
}

function handleResponse(message) {
  console.log(`Message from the content script:  ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function notifyActiveTab(message) {
  console.log(message);
  var querying = browser.tabs.query({
    currentWindow: true,
    active: true
  });
  querying.then((tabs) => {
    var sending = browser.tabs.sendMessage(tabs[0].id, message);
    sending.then(handleResponse, handleError);
  });
}
