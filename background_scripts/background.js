function logTabs(tabs) {
  for (let tab of tabs) {
    // tab.url requires the `tabs` permission
    console.log(tab);

    browser.tabs.executeScript(tab.id, {
      file: "/vendor/diff_match_patch.js"
    }, function () {
      browser.tabs.executeScript(tab.id, {
        file: "/vendor/Readability.js"
      }, function () {
        browser.tabs.executeScript(tab.id, {
          file: "/content_scripts/content.js"
        }, function () {
          console.log(`Loaded content_scripts`);
        });
      });
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
