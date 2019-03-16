console.log(`Readability start`);
var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
console.log(article);
console.log(`Readability end`)


function handleResponse(message) {
  console.log(`Message from the background script:  ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

/**
 * Send a message to the browser (extension).
 */
var sending = browser.runtime.sendMessage({
    cmd: 'open-reader',
    article
});
sending.then(handleResponse, handleError);
