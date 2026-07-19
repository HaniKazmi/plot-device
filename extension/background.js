chrome.contextMenus.create({
  id: "gc-show",
  title: "Upload Show Image",
  contexts: ["image"],
});

chrome.contextMenus.create({
  id: "gc-movie",
  title: "Upload Movie Image",
  contexts: ["image"],
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "gc-show") {
    const url = `shortcuts://run-shortcut?name=Upload Show Image&input=${info.srcUrl}`;
    chrome.tabs.create({ url: url });
  }
  if (info.menuItemId === "gc-movie") {
    const url = `shortcuts://run-shortcut?name=Upload Movie Image&input=${info.srcUrl}`;
    chrome.tabs.create({ url: url });
  }
});
