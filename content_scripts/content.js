console.log(`Readability start`);
var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
console.log(`Readability end`);

// Template for reader view.
var head_template = `
  <meta charset="utf-8"/>
  <title>${article.title}</title>
  <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/tufte-css/1.4/tufte.min.css"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
`

var body_template = `
  <article id="readability-container">
    <h1 id="readability-1-title">${article.title}</h1>
    <div id="readability-1-content">${article.content}</div>
    <h1 id="readability-2-title"></h1>
    <div id="readability-2-content"></div>
  </article>
`

// Try to replace everything.
document.body.outerHTML = '';
document.head.outerHTML = '';
document.head.innerHTML = head_template;
document.body.innerHTML = body_template;

var dmp = new diff_match_patch();

function diff_title() {
  console.log('diff title start');
  var text1 = document.getElementById('readability-1-title').textContent.trim();
  var text2 = document.getElementById('readability-2-title').textContent.trim();

  var ms_start = (new Date()).getTime();
  var d = dmp.diff_main(text2, text1);
  var ms_end = (new Date()).getTime();

  dmp.diff_cleanupSemantic(d);
  // dmp.diff_cleanupEfficiency(d);
  var ds = dmp.diff_prettyHtml(d);
  document.getElementById('readability-1-title').innerHTML = ds;
  document.getElementById('readability-2-title').innerHTML = '';
  console.log('diff title end');
}

// get array of descendant elements
function getDescendantElements(parent) {
  return [].slice.call(parent.getElementsByTagName('*'));
}

function replaceTags(parent) {
  var descendants = getDescendantElements(parent);
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
}

function diff_content() {
  console.log('diff content start');
  var text1 = document.getElementById('readability-1-content');
  var text2 = document.getElementById('readability-2-content');

  replaceTags(text1);
  replaceTags(text2);

  text1 = text1.textContent.trim();
  text2 = text2.textContent.trim();

  var ms_start = (new Date()).getTime();
  var d = dmp.diff_main(text2, text1);
  var ms_end = (new Date()).getTime();

  dmp.diff_cleanupSemantic(d);
  // dmp.diff_cleanupEfficiency(d);
  var ds = dmp.diff_prettyHtml(d);
  document.getElementById('readability-1-content').innerHTML = '<p>' + ds + '</p>';
  document.getElementById('readability-2-content').innerHTML = '';
  console.log('diff content end');
}

/**
 * Add a listener on the browser messages.
 */
function handleMessage(request, sender, sendResponse) {
  console.log(request);
  sendResponse({response: "Response from content script"});
  if (request.cmd === 'response-revisions') {
    var article = request.article;
    document.getElementById('readability-2-title').textContent = article.title;
    document.getElementById('readability-2-content').innerHTML = article.content;
    diff_title();
    diff_content();
  }
}
browser.runtime.onMessage.addListener(handleMessage);


function handleResponse(message) {
  console.log(`Message from the background script:  ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function notifyBackgroundPage(message) {
  console.log(message);
  var sending = browser.runtime.sendMessage(message);
  sending.then(handleResponse, handleError);
}

$( document ).ready(function() {
  var url = window.location.href;
  notifyBackgroundPage({
    cmd: 'fetch-revisions',
    url
  });
});
