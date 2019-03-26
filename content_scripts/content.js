var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();

var dmp = new diff_match_patch();
String.prototype.regexIndexOf = function(regex, startpos) {
  var indexOf = this.substring(startpos || 0).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}
diff_match_patch.prototype.diff_linesToWords_=function(a,b){function c(a){for(var b="",c=0,g=-1,h=d.length;g<a.length-1;){g=a.regexIndexOf("\\W",c);-1==g&&(g=a.length-1);var l=a.substring(c,g+1);(e.hasOwnProperty?e.hasOwnProperty(l):void 0!==e[l])?b+=String.fromCharCode(e[l]):(h==f&&(l=a.substring(c),g=a.length),b+=String.fromCharCode(h),e[l]=h,d[h++]=l);c=g+1}return b}var d=[],e={};d[0]="";var f=4E4,g=c(a);f=65535;var h=c(b);return{chars1:g,chars2:h,lineArray:d}};

function diff_lineMode(text1, text2) {
  var a = dmp.diff_linesToChars_(text1, text2);
  var lineText1 = a.chars1;
  var lineText2 = a.chars2;
  var lineArray = a.lineArray;
  var diffs = dmp.diff_main(lineText1, lineText2, true);
  dmp.diff_cleanupSemantic(diffs);
  dmp.diff_charsToLines_(diffs, lineArray);
  return diffs;
}

function diff_wordMode(text1, text2) {
  var a = dmp.diff_linesToWords_(text1, text2);
  var lineText1 = a.chars1;
  var lineText2 = a.chars2;
  var lineArray = a.lineArray;
  var diffs = dmp.diff_main(lineText1, lineText2, true);
  dmp.diff_cleanupSemantic(diffs);
  dmp.diff_charsToLines_(diffs, lineArray);
  return diffs;
}

function diff_charMode(text1, text2) {
  var diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);
  return diffs;
}

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
    <i><p id="readability-datetime"></p></i>
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
  var ds = dmp.diff_prettyHtml(d);
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
  var ds = dmp.diff_prettyHtml(d);
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
    document.getElementById('readability-datetime').textContent = `Compared to snapshot from ${datetime}`;
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
