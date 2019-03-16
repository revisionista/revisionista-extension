// Modified from https://stackoverflow.com/a/55140711
function executeScripts(tabId, scripts) {
  return new Promise(function(resolve, reject) {
    try {
      if (scripts.length && scripts.length > 0) {
        function execute(index = 0) {
          browser.tabs.executeScript(tabId, scripts[index]).then(() => {
            var newIndex = index + 1;
            if (scripts[newIndex]) {
              execute(newIndex);
            } else {
              resolve();
            }
          });
        }
        execute();
      } else {
        throw new Error('scripts(array) undefined or empty');
      }
    } catch (err) {
      reject(err);
    }
  });
};
