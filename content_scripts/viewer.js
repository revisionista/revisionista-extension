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


function diff_title() {
  var text1 = innerDoc.getElementById('readability-1-title').textContent.trim();
  var text2 = innerDoc.getElementById('readability-2-title').textContent.trim();

  var d = diff_charMode(text2, text1);
  var ds = dmp.diff_prettierHtml(d);
  innerDoc.getElementById('readability-1-title').innerHTML = ds;
  innerDoc.getElementById('readability-2-title').innerHTML = '';
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
  var text1 = innerDoc.getElementById('readability-1-content');
  var text2 = innerDoc.getElementById('readability-2-content');

  // replace tags by actual linefeeds and collapse
  // replaceTags(text1);
  // replaceTags(text2);

  text1 = text1.textContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  text2 = text2.textContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  var d = diff_wordMode(text2, text1);
  var ds = dmp.diff_prettierHtml(d);
  innerDoc.getElementById('readability-1-content').innerHTML = '<p>' + ds + '</p>';
  ìframe.getElementById('readability-2-content').innerHTML = '';
}

/**
 * Add a listener on the browser messages.
 */
function handleMessage(request, sender, sendResponse) {
  if (request.cmd === 'response-revisions') {
    sendResponse({response: "received-revisions"});
    var article = request.article;
    var datetime = request.datetime;
    document.getElementById('readability-datetime').textContent = `Snapshot from ${datetime}`;
    document.getElementById('readability-2-title').textContent = article.title;
    document.getElementById('readability-2-content').innerHTML = article.content;
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
  let sending = browser.runtime.sendMessage(message);
  sending.then(handleResponse, handleError);
}
