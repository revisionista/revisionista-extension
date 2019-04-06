function handleResponse(message) {
  console.log(`Message from the background script:  ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function notifyBackgroundPage(message) {
  let sending = browser.runtime.sendMessage(message);
  sending.then(handleResponse, handleError);
}

let probablyReaderable = isProbablyReaderable(document);
notifyBackgroundPage({
  cmd: 'probablyReaderable',
  probablyReaderable
});
