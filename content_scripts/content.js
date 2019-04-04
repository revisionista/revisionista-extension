var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
var dmp = new diff_match_patch();

function diff_lineMode(text1, text2) {
  // Scan the text on a line-by-line basis first.
  var a = dmp.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var lineArray = a.lineArray;

  var diffs = dmp.diff_main(text1, text2, false);

  // Convert the diff back to original text.
  dmp.diff_charsToLines_(diffs, lineArray);
  // Eliminate freak matches (e.g. blank lines)
  dmp.diff_cleanupSemanticLossless(diffs);
  return diffs;
}

function diff_sentenceMode(text1, text2) {
  // Scan the text on a line-by-line basis first.
  var a = dmp.diff_sentencesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var lineArray = a.lineArray;

  var diffs = dmp.diff_main(text1, text2, false);

  // Convert the diff back to original text.
  dmp.diff_charsToSentences_(diffs, lineArray);
  // Eliminate freak matches (e.g. blank lines)
  dmp.diff_cleanupSemanticLossless(diffs);
  return diffs;
}

function diff_wordMode(text1, text2) {
  // Scan the text on a line-by-line basis first.
  var a = dmp.diff_wordsToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var lineArray = a.lineArray;

  var diffs = dmp.diff_main(text1, text2, false);

  // Convert the diff back to original text.
  dmp.diff_charsToWords_(diffs, lineArray);
  // Eliminate freak matches (e.g. blank lines)
  dmp.diff_cleanupSemanticLossless(diffs);
  return diffs;
}

function diff_charMode(text1, text2) {
  var diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);
  return diffs;
}

// Template for reader view.
var head_template = `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="description" content="">
  <title>${article.title}</title>
  <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/tufte-css/1.4/tufte.min.css"/>
  <style>
    del {
      color: #b31d28;
      background-color: #ffeef0;
    }

    ins {
      color: #22863a;
      background-color: #f0fff4;
    }

    del + ins {
      color: #b58900;
      background-color: #fdf6e3;
    }
  </style>
`

var body_template = `
  <article id="readability-container">
    <h1 id="readability-1-title">${article.title}</h1>
    <section id="readability-subtitle">
    <p>
      <span class="marginnote"><i id="readability-datetime"></i></span>
      <span class="marginnote">
        Green text, is a widely recognizable <ins>added-text</ins> indicator.
        Red text, is also easily recognized as <del>removed-text</del><ins>removed-text, while Orange text is used to indicate replacement.</ins> 
      </span>
    </p>
    </section>
    <section id="readability-1-content">${article.content}</section>
    <h1 id="readability-2-title"></h1>
    <section id="readability-2-content"></section>
  </article>
`

// Try to replace everything.
document.body.outerHTML = '';
document.head.outerHTML = '';
document.head.innerHTML = head_template;
document.body.innerHTML = body_template;

function diff_title() {
  var text1 = document.getElementById('readability-1-title').textContent.trim();
  var text2 = document.getElementById('readability-2-title').textContent.trim();

  var d = diff_charMode(text2, text1);
  var ds = dmp.diff_prettierHtml(d);
  document.getElementById('readability-1-title').innerHTML = ds;
  document.getElementById('readability-2-title').innerHTML = '';
}

// get array of descendant elements
function getDescendantElements(parent) {
  return [].slice.call(parent.getElementsByTagName('*'));
}

const TAGS_TO_REPLACE = ['SECTION', 'MAIN', 'DIV', 'P', 'BLOCKQUOTE'];
function replaceTags(parent) {
  const descendants = getDescendantElements(parent);
  for (let i = 0; i < descendants.length; ++i) {
    let e = descendants[i];
    if (TAGS_TO_REPLACE.includes(e.tagName)) {
      let d = document.createElement('span');
      d.textContent = '\n\n';
      e.appendChild(d);
    }
  }
}

function diff_content() {
  var text1 = document.getElementById('readability-1-content');
  var text2 = document.getElementById('readability-2-content');

  // replace tags by actual linefeeds and collapse
  replaceTags(text1);
  replaceTags(text2);

  text1 = text1.textContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  text2 = text2.textContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  var d = diff_wordMode(text2, text1);
  var ds = dmp.diff_prettierHtml(d);
  document.getElementById('readability-1-content').innerHTML = '<p>' + ds + '</p>';
  document.getElementById('readability-2-content').innerHTML = '';
}

/**
 * Add a listener on the browser messages.
 */
function handleMessage(request, sender, sendResponse) {
  if (request.cmd === 'response-revisions') {
    sendResponse({response: "received-revisions"});
    var datetime = request.datetime;
    document.getElementById('readability-datetime').textContent = `Snapshot from ${datetime}`;
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
  var sending = browser.runtime.sendMessage(message);
  sending.then(handleResponse, handleError);
}
