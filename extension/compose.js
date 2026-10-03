// A game card shows its artwork at 16:9, cropped from the centre (`object-fit: cover`), so the
// window draws the whole wallpaper with that frame lit and the rest dimmed. Moving or tightening
// the frame, or laying a logo inside it, makes the upload the frame alone — composed against the
// whole wallpaper, a logo near the edge of a 16:10 or ultrawide picture lands in a strip no card
// shows.
const FRAME = 16 / 9;

// The buckets' own banners are 1280 wide; a 4K wallpaper stored whole is several times the bytes
// for detail a card is never drawn large enough to show.
const MAX_WIDTH = 1920;

// The gap a snapped logo keeps from the frame's edges, as a fraction of the frame's width.
const MARGIN = 0.04;

// How far the frame can tighten: at 4× a 1920-wide wallpaper still yields a 480-wide frame.
const MAX_ZOOM = 4;

const DIM = "rgba(0, 0, 0, 0.6)";

const clamp = (value, min, max) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)));

// Paste and drop both hand over a DataTransfer.
const imageFile = (data) => [...data.files].find((f) => f.type.startsWith("image/"));

// Owns the crop and logo over `background`, and the panel of controls for them. The caller asks
// only what to upload and what to say about it.
export const mountComposer = ({ background, canvas, panel, fetchBlob, onChange, onError }) => {
  const box = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const control = (name) => panel.querySelector(`[data-control="${name}"]`);

  // The widest 16:9 frame the wallpaper holds, which zoom divides.
  const fullW = background.width / background.height > FRAME ? background.height * FRAME : background.width;
  const fullH = fullW / FRAME;
  // The frame's centre in wallpaper pixels, and how far it is tightened.
  let fx = background.width / 2;
  let fy = background.height / 2;
  let zoom = 1;
  let logo;
  // The logo's centre as fractions of the frame, and its width as a fraction of the frame's width,
  // so it travels with the frame and survives the preview and the upload being drawn at different sizes.
  let cx = 0.5;
  let cy = 0.5;
  let size = 0.4;
  let drag;
  // The wallpaper scaled once to the canvas's pixels, so a frame copies it rather than resampling
  // a 4K bitmap on every pointer move.
  let preview;

  const frame = () => {
    const w = fullW / zoom;
    const h = fullH / zoom;
    return { x: fx - w / 2, y: fy - h / 2, w, h };
  };

  const halfExtent = () => {
    const halfW = size / 2;
    return { halfW, halfH: ((halfW * logo.height) / logo.width) * FRAME };
  };

  const keepInside = () => {
    const { w, h } = frame();
    fx = clamp(fx, w / 2, background.width - w / 2);
    fy = clamp(fy, h / 2, background.height - h / 2);
    if (!logo) return;
    const { halfW, halfH } = halfExtent();
    cx = clamp(cx, halfW, 1 - halfW);
    cy = clamp(cy, halfH, 1 - halfH);
  };

  // The logo onto a context whose frame spans (x, y, w, h).
  const paintLogo = (target, x, y, w, h) => {
    if (!logo) return;
    const { halfW, halfH } = halfExtent();
    target.drawImage(logo, x + (cx - halfW) * w, y + (cy - halfH) * h, 2 * halfW * w, 2 * halfH * h);
  };

  const adjusted = () =>
    Boolean(logo) ||
    zoom !== 1 ||
    Math.abs(fx - background.width / 2) > 0.5 ||
    Math.abs(fy - background.height / 2) > 0.5;

  // What the upload holds: the frame at its own resolution, capped, never enlarged.
  const outputWidth = () => Math.round(Math.min(frame().w, MAX_WIDTH));

  // Untouched, the upload is the original file and the caller states its own facts.
  const describe = () =>
    adjusted()
      ? `Uploads the lit frame as ${outputWidth()} × ${Math.round(outputWidth() / FRAME)} JPEG${logo ? " with the logo" : ""}`
      : undefined;

  const draw = () => {
    if (!preview) return;
    const scale = canvas.width / background.width;
    ctx.drawImage(preview, 0, 0);
    const { x, y, w, h } = frame();
    const [x0, y0, fw, fh] = [x * scale, y * scale, w * scale, h * scale];
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 0, canvas.width, y0);
    ctx.fillRect(0, y0 + fh, canvas.width, canvas.height - y0 - fh);
    ctx.fillRect(0, y0, x0, fh);
    ctx.fillRect(x0 + fw, y0, canvas.width - x0 - fw, fh);
    ctx.imageSmoothingQuality = "high";
    paintLogo(ctx, x0, y0, fw, fh);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = devicePixelRatio;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, fw - 1, fh - 1);
  };

  let lastFacts;
  const syncPanel = () => {
    control("zoom").value = Math.round(zoom * 100);
    control("logo-hint").hidden = Boolean(logo);
    control("logo-controls").hidden = !logo;
    const facts = describe();
    if (facts === lastFacts) return;
    lastFacts = facts;
    onChange();
  };

  // A trackpad delivers pointer and wheel events faster than the display shows them, so state
  // changes as often as they arrive and the picture is drawn once a frame.
  let pending = false;
  const changed = () => {
    keepInside();
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      draw();
      syncPanel();
    });
  };

  // Fitted to its box by hand: a canvas sized by CSS alone stretches its pixels to the box. A
  // window being resized fits many times over, and a downscale that resolves after a later one
  // would size the canvas for a box that has since moved, so only the latest is applied.
  let fitting = 0;
  const fit = async () => {
    const generation = ++fitting;
    const cssScale = Math.min(box.clientWidth / background.width, box.clientHeight / background.height);
    if (!cssScale) return;
    const width = Math.round(background.width * cssScale * devicePixelRatio);
    const height = Math.round(background.height * cssScale * devicePixelRatio);
    const next = await createImageBitmap(background, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
    if (generation !== fitting) {
      next.close();
      return;
    }
    canvas.style.width = `${background.width * cssScale}px`;
    canvas.style.height = `${background.height * cssScale}px`;
    canvas.width = width;
    canvas.height = height;
    preview?.close();
    preview = next;
    changed();
  };
  new ResizeObserver(fit).observe(box);

  // The pointer in wallpaper pixels.
  const pointerAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * background.width,
      y: ((event.clientY - rect.top) / rect.height) * background.height,
    };
  };

  // The pointer as fractions of the frame, which is where the logo is held.
  const inFrame = ({ x, y }) => {
    const f = frame();
    return { x: (x - f.x) / f.w, y: (y - f.y) / f.h };
  };

  const onLogo = (at) => {
    if (!logo) return false;
    const { x, y } = inFrame(at);
    const { halfW, halfH } = halfExtent();
    return Math.abs(x - cx) <= halfW && Math.abs(y - cy) <= halfH;
  };

  // A press on the logo carries the logo; a press anywhere else carries the frame.
  canvas.addEventListener("pointerdown", (event) => {
    const at = pointerAt(event);
    if (onLogo(at)) {
      const { x, y } = inFrame(at);
      drag = { logo: true, dx: cx - x, dy: cy - y };
    } else {
      drag = { logo: false, from: at, fx, fy };
    }
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    const at = pointerAt(event);
    if (!drag) {
      canvas.style.cursor = onLogo(at) ? "grab" : "";
      return;
    }
    if (drag.logo) {
      const { x, y } = inFrame(at);
      cx = x + drag.dx;
      cy = y + drag.dy;
    } else {
      fx = drag.fx + at.x - drag.from.x;
      fy = drag.fy + at.y - drag.from.y;
    }
    changed();
  });
  canvas.addEventListener("pointerup", () => (drag = undefined));
  canvas.addEventListener("pointercancel", () => (drag = undefined));
  // A trackpad pinch arrives as a wheel event with the control key held.
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom = clamp(zoom * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002)), 1, MAX_ZOOM);
      changed();
    },
    { passive: false },
  );

  // A dropped logo can be fetched from a slow host while a pasted one decodes at once; the one
  // supplied last is the one kept, whichever finishes first.
  let supplied = 0;
  const setLogo = async (source) => {
    const generation = ++supplied;
    try {
      const next = await createImageBitmap(await source);
      if (generation !== supplied) {
        next.close();
        return;
      }
      logo?.close();
      logo = next;
      changed();
    } catch (error) {
      if (generation === supplied) onError(`That logo could not be read: ${error.message}`);
    }
  };

  // A dragged image arrives as a file from Finder, and from another tab as markup or a link whose
  // address is fetched here — the markup first, since an image inside a link drags the link's
  // address as its URL.
  const droppedLogo = (data) => {
    const file = imageFile(data);
    if (file) return file;
    const html = data.getData("text/html");
    const url =
      (html && new DOMParser().parseFromString(html, "text/html").querySelector("img")?.src) || data.getData("URL");
    return url ? fetchBlob(url) : undefined;
  };

  // A paste carrying an image is a logo; one carrying text still lands in whatever field has focus.
  document.addEventListener("paste", (event) => {
    const file = imageFile(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    setLogo(file);
  });
  // A drop onto a field is text for that field, so the window takes over every drop but those.
  const intoField = (event) => event.target instanceof Element && event.target.closest("input, textarea");
  const dropping = (on) => box.classList.toggle("dropping", on);
  document.addEventListener("dragover", (event) => {
    if (intoField(event)) return dropping(false);
    event.preventDefault();
    dropping(true);
  });
  document.addEventListener("dragleave", (event) => {
    if (!event.relatedTarget) dropping(false);
  });
  document.addEventListener("drop", (event) => {
    if (intoField(event)) return;
    event.preventDefault();
    dropping(false);
    const source = droppedLogo(event.dataTransfer);
    if (source) setLogo(source);
  });

  control("zoom").addEventListener("input", (event) => {
    zoom = clamp(event.target.value / 100, 1, MAX_ZOOM);
    changed();
  });
  control("crop-reset").addEventListener("click", () => {
    zoom = 1;
    fx = background.width / 2;
    fy = background.height / 2;
    changed();
  });
  control("logo-size").addEventListener("input", (event) => {
    size = event.target.value / 100;
    changed();
  });
  for (const button of panel.querySelectorAll("[data-snap]")) {
    button.addEventListener("click", () => {
      const place = button.dataset.snap;
      const { halfW, halfH } = halfExtent();
      const marginY = MARGIN * FRAME;
      cx = place.includes("left") ? MARGIN + halfW : place.includes("right") ? 1 - MARGIN - halfW : 0.5;
      cy = place.includes("top") ? marginY + halfH : place.includes("bottom") ? 1 - marginY - halfH : 0.5;
      changed();
    });
  }
  control("logo-remove").addEventListener("click", () => {
    logo?.close();
    logo = undefined;
    changed();
  });

  const render = async () => {
    const width = outputWidth();
    const height = Math.round(width / FRAME);
    const out = new OffscreenCanvas(width, height);
    const target = out.getContext("2d");
    target.imageSmoothingQuality = "high";
    const { x, y, w, h } = frame();
    target.drawImage(background, x, y, w, h, 0, 0, width, height);
    paintLogo(target, 0, 0, width, height);
    return { blob: await out.convertToBlob({ type: "image/jpeg", quality: 0.9 }), type: "image/jpeg" };
  };

  return {
    // An untouched wallpaper goes up as the original file, which the card crops exactly as the
    // frame showed.
    body: (original) => (adjusted() ? render() : original),
    describe,
  };
};
