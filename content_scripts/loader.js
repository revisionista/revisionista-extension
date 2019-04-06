var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
var dmp = new diff_match_patch();

var innerDoc;
var iframe = document.createElement('iframe');
iframe.className = "readability-iframe";
iframe.frameBorder = "0";
iframe.scrolling = "no";
iframe.onload = onLoad(iframe);
iframe.src = browser.runtime.getURL("templates/diff.html");
document.body.appendChild(iframe);

function onLoad(iframe) {
  console.log("loaded");
}