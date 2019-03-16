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
      console.log(`Loaded revisionist.`);
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
  console.log("Message from the content script: " +
    request.cmd);
  sendResponse({response: "Response from background script"});
}
browser.runtime.onMessage.addListener(handleMessage);
