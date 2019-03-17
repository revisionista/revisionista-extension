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
    <h1 id="readability-title">${article.title}</h1>
    <div id="readability-content">${article.content}</div>
  </article>
`

// Try to replace everything.
document.body.outerHTML = '';
document.head.outerHTML = '';
document.head.innerHTML = head_template;
document.body.innerHTML = body_template;

var dmp = new diff_match_patch();

function diff_title() {
  console.log('diff title');
  var text1 = document.getElementById('readability-title').textContent.trim();
  var text2 = document.getElementById('readability-title').textContent.trim();

  var ms_start = (new Date()).getTime();
  var d = dmp.diff_main(text1, text2);
  var ms_end = (new Date()).getTime();

  dmp.diff_cleanupSemantic(d);
  // dmp.diff_cleanupEfficiency(d);
  var ds = dmp.diff_prettyHtml(d);
  document.getElementById('readability-title').innerHTML = ds;
}
diff_title()

// get array of descendant elements
function getDescendantElements(parent) {
  return [].slice.call(parent.getElementsByTagName('*'));
}

function diff_content() {
  console.log('diff content');
  var text1 = document.getElementById('readability-content');
  var text2 = document.getElementById('readability-content');

  var descendants = getDescendantElements(text1);
  var i, e, d;
  for (i = 0; i < descendants.length; ++i) {
    e = descendants[i];
    if (e.tagName === 'SECTION' ||
        e.tagName === 'MAIN' ||
        e.tagName === 'DIV' ||
        e.tagName === 'P' ||
        e.tagName === 'BLOCKQUOTE') {
      d = document.createElement('span');
      d.textContent = '\n\n';
      e.appendChild(d);
    }
  }

  text1 = text1.textContent.trim();
  text2 = text2.textContent.trim();

  var ms_start = (new Date()).getTime();
  var d = dmp.diff_main(text1, text2);
  var ms_end = (new Date()).getTime();

  dmp.diff_cleanupSemantic(d);
  // dmp.diff_cleanupEfficiency(d);
  var ds = dmp.diff_prettyHtml(d);
  document.getElementById('readability-content').innerHTML = '<p>' + ds + '</p>';
}
diff_content();

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
