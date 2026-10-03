import { MEDIA } from "./media.js";

// A service worker reruns its top level on every wake, so creating the menus there throws a
// duplicate-id error each time; they persist across wakes once made at install.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const [id, { label }] of Object.entries(MEDIA)) {
      chrome.contextMenus.create({
        id,
        title: `Upload ${label} Image`,
        contexts: ["image"],
        // A data: or blob: image has no address worth fetching from a separate window, and a
        // large data: URL in a query string fails long before it reaches the bucket.
        targetUrlPatterns: ["https://*/*", "http://*/*"],
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (!(info.menuItemId in MEDIA)) return;
  const params = new URLSearchParams({ medium: info.menuItemId, src: info.srcUrl });
  chrome.windows.create({
    url: `upload.html?${params}`,
    type: "popup",
    width: 440,
    height: 680,
  });
});
