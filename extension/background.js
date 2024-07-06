chrome.contextMenus.create({
    id: "gc-upload",
    title: "Upload to GC",
    contexts: ["image"],
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "gc-upload") {
        const url = `shortcuts://run-shortcut?name=Test&input=${info.srcUrl}`;
        chrome.tabs.create({ url: url });
    }
});
