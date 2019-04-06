// Modified from https://stackoverflow.com/a/55140711
const executeScripts = (tabId, scripts) => {
  return new Promise((resolve, reject) => {
    try {
      if (scripts.length && scripts.length > 0) {
        const execute = (index = 0) => {
          browser.tabs.executeScript(tabId, scripts[index]).then(() => {
            const newIndex = index + 1;
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
