console.log(`Readability start`);
var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
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
  var d = dmp.diff_main(text1, text2);
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
  var d = dmp.diff_main(text1, text2);
  var ms_end = (new Date()).getTime();

  dmp.diff_cleanupSemantic(d);
  // dmp.diff_cleanupEfficiency(d);
  var ds = dmp.diff_prettyHtml(d);
  document.getElementById('readability-1-content').innerHTML = '<p>' + ds + '</p>';
  document.getElementById('readability-2-content').innerHTML = '';
  console.log('diff content end');
}

/*
 * Parse the Memento response.
 */
function parse_memento(data) {
  if (data.length == 0) {
    throw new Error("input must not be of zero length");
  }

  var entries = [];
  var items = data.split('\n')
  $.each(items, function(index, value) {
    var memento = value.split(';');
    if (memento.length < 2) {
      throw new Error("memento could not be split on ';'");
    }
    var url = memento[0].replace(/<(.*)>/, '$1').trim();
    var name = memento[1].replace(/rel="(.*)"/, '$1').trim();
    if (memento.length > 2 && name === "memento") {
      var datetime = memento[2].replace(/datetime="(.*)"/, '$1').trim();
      entries.push({'url': url, 'name': name, 'datetime': datetime});
    }
  });

  return entries;
}

$( document ).ready(function() {
  var url = "https://arquivo.pt/wayback/timemap/*/" + window.location.href;
  console.log(url);
  $.ajax({
    url: url,
    context: document.body
  }).done(function(data) {
    var entries = parse_memento(data);

    if (entries.length > 0) {
      var url = entries[0].url.replace("https://arquivo.pt/wayback/", "https://arquivo.pt/noFrame/replay/");
      console.log(url);
      $.ajax({
        url: url,
        context: document.body
      }).done(function(data) {
        console.log(`Readability start`);
        var p = new DOMParser();
        var doc = p.parseFromString(data, 'text/html');
        var article = new Readability(doc).parse();
        console.log(`Readability end`)
        $('#readability-2-title').text(article.title);
        $('#readability-2-content').html(article.content);
        diff_title();
        diff_content();
      });
    }
  });
});


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
