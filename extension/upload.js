import { dropToken, getToken } from "./auth.js";
import { mountComposer } from "./compose.js";
import { MEDIA, artworkUrl } from "./media.js";

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const { label, bucket, banner } = MEDIA[params.get("medium")];
const src = params.get("src");

// The image as fetched once: the preview and the upload are the same bytes, so what is shown is
// what lands in the bucket — and a CDN that refuses a hotlinked <img> still answers a fetch.
let image;

const showError = (message) => {
  $("error").textContent = message;
  $("error").hidden = false;
};

// A CDN often answers application/octet-stream, which stored as-is makes the bucket serve a
// download rather than a picture. The leading bytes say what the file is whatever the header says.
const SIGNATURES = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/gif", [0x47, 0x49, 0x46, 0x38]],
];
const sniffType = (bytes) => {
  const ascii = (from, to) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ascii(8, 12).startsWith("avi")) return "image/avif";
  return SIGNATURES.find(([, sig]) => sig.every((b, i) => bytes[i] === b))?.[0];
};

const fetchImage = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The image answered ${response.status}`);
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const type = sniffType(bytes) ?? (blob.type.startsWith("image/") ? blob.type : undefined);
  if (!type) throw new Error(`Not an image: the server sent ${blob.type || "no type"}`);
  return { blob, type };
};

const formatSize = (bytes) => (bytes < 1_000_000 ? `${Math.round(bytes / 1000)} kB` : `${(bytes / 1e6).toFixed(1)} MB`);

let sourceFacts = "";
// Present for a banner once its wallpaper is decoded; it owns the crop and the logo.
let composer;

const updateFacts = () => {
  $("facts").textContent = composer?.describe() ?? sourceFacts;
};

const showImage = async () => {
  image = await fetchImage(src);
  let width;
  let height;
  // A banner is previewed as the crop the card draws, so the canvas takes the picture's place.
  if (banner) {
    const background = await createImageBitmap(image.blob);
    ({ width, height } = background);
    $("picture").remove();
    $("canvas").hidden = false;
    $("adjust").hidden = false;
    composer = mountComposer({
      background,
      canvas: $("canvas"),
      panel: $("adjust"),
      fetchBlob: (url) => fetchImage(url).then(({ blob }) => blob),
      onChange: updateFacts,
      onError: showError,
    });
  } else {
    const img = new Image();
    img.src = URL.createObjectURL(image.blob);
    await img.decode();
    URL.revokeObjectURL(img.src);
    ({ naturalWidth: width, naturalHeight: height } = img);
    $("picture").replaceWith(img);
  }
  sourceFacts = `${width} × ${height} · ${image.type.slice(6).toUpperCase()} · ${formatSize(image.blob.size)}`;
  updateFacts();
  updateUploadButton();
};

const objectName = () => $("name").value.trim();

// While an upload is out the name is fixed and the window stays open: the object, the cell and a
// retry all name what was submitted, and closing the window would abort the request unannounced.
let uploading = false;

// A 403 is the account signed in lacking write access to the bucket, which signing in silently
// again would only repeat; the next attempt offers the account chooser instead.
let chooseAccount = false;

const updateUploadButton = () => {
  $("upload").disabled = uploading || !image || !objectName();
};

// The bucket is publicly readable, so whether a name is taken is asked without a token. Uploading
// to a taken name replaces that picture, which is how artwork is swapped, so it is said, not refused.
let checking;
const checkExisting = async () => {
  const name = objectName();
  checking = name;
  $("existing-picture").hidden = true;
  $("existing").textContent = "";
  if (!name) return;
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}?fields=name`,
  );
  if (checking !== name) return;
  if (response.status === 404) {
    $("existing").textContent = "New image";
  } else if (response.ok) {
    // Fresh rather than cached, since the cached copy may be the one this window is replacing.
    $("existing-picture").src =
      `${artworkUrl(bucket, name.split("/").map(encodeURIComponent).join("/"))}?t=${Date.now()}`;
    $("existing-picture").hidden = false;
    $("existing").textContent = "Replaces this image";
  }
};

const upload = (token, name, body) =>
  fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": body.type },
      body: body.blob,
    },
  );

const describeFailure = async (response) => {
  const body = await response.json().catch(() => undefined);
  return body?.error?.message ?? `The bucket answered ${response.status}`;
};

const submit = async (event) => {
  event.preventDefault();
  const name = objectName();
  uploading = true;
  updateUploadButton();
  $("name").readOnly = true;
  $("error").hidden = true;
  $("upload").textContent = "Uploading…";
  try {
    // The JPEG encode and the sign-in are independent, and either can take a moment.
    const [body, token] = await Promise.all([composer?.body(image) ?? image, getToken({ chooseAccount })]);
    chooseAccount = false;
    let response = await upload(token, name, body);
    // A cached token can be revoked before it expires; one fresh grant is worth a second try.
    if (response.status === 401) {
      await dropToken();
      response = await upload(await getToken(), name, body);
    }
    if (response.status === 403) {
      await dropToken();
      chooseAccount = true;
      throw new Error(`${await describeFailure(response)} Upload again to choose another account.`);
    }
    if (!response.ok) throw new Error(await describeFailure(response));

    const cell = artworkUrl(bucket, name);
    $("result").textContent = cell;
    $("form").hidden = true;
    $("done").hidden = false;
    $("close").focus();
    // The upload has landed whatever the clipboard says, so a refused copy is a note and not an error.
    $("copied").textContent = await navigator.clipboard.writeText(cell).then(
      () => "Copied to the clipboard",
      () => "Select the line above to copy it",
    );
  } catch (error) {
    showError(error.message);
    $("upload").textContent = "Upload";
    $("name").readOnly = false;
  } finally {
    uploading = false;
    updateUploadButton();
  }
};

let debounce;
$("name").addEventListener("input", () => {
  updateUploadButton();
  clearTimeout(debounce);
  debounce = setTimeout(() => checkExisting().catch(() => ($("existing").textContent = "")), 250);
});
$("form").addEventListener("submit", submit);
$("cancel").addEventListener("click", () => window.close());
$("close").addEventListener("click", () => window.close());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !uploading) window.close();
});

document.title = `Upload ${label} Image`;
$("title").textContent = `Upload ${label} Image`;
$("name").focus();
showImage().catch((error) => {
  // A banner has already swapped the placeholder for its canvas by the time mounting can fail.
  if ($("picture")) $("picture").textContent = "No preview";
  showError(error.message);
});
