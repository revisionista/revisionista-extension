console.log(`Readability start`);
var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
console.log(article);
console.log(`Readability end`)

// Template for reader view.
var head_template = `
  <meta charset="utf-8"/>
  <title>${article.title}</title>
  <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/tufte-css/1.4/tufte.min.css"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
`

var body_template = `
  <article id="readability-container">
    <h1>${article.title}</h1>
    <p>${article.content}</p>
  </article>
`

// Try to replace everything.
document.body.outerHTML = '';
document.head.outerHTML = '';
document.head.innerHTML = head_template;
document.body.innerHTML = body_template;

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
