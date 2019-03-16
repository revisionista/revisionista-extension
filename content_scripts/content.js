console.log(`Readability start`);
var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
console.log(article);
console.log(`Readability end`)
