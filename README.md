# GIF it to me Baby

A tiny, privacy-friendly web app that turns images into an animated GIF — or edits an existing one — entirely in your browser. No files are ever uploaded to a server.

**Live at:** [gifit.michels.world](https://gifit.michels.world)

## Features

- Select or drag & drop multiple images (any browser-supported format: PNG, WEBP, JPG, BMP, …) — each image becomes its own GIF frame
- **Load an existing GIF**: every frame is extracted individually (correctly composited according to its disposal method) and dropped into the same frame list as regular images — so you can keep editing, trim, reorder, or mix it with new images
- Adjustable default options:
  - **Frame duration (ms)** — default for newly added frames, overridable per frame in the list
  - **Resolution (width × height)** — auto-filled from the first frame you add; all frames are scaled to fit proportionally (padded with white if the aspect ratio doesn't match)
  - **Quality** — sampling rate of the color quantizer (1 = best quality/slowest, 30 = fastest/coarsest)
  - **Color depth** — 2 to 256 colors; reduces the color count before encoding (simplified posterize-style quantization) for smaller file sizes
  - **Loop forever** — on/off
- Frame list with thumbnail preview, per-frame duration, up/down reordering, and removing individual frames
- **Remove all frames** resets the list completely
- **Morph two images…**: pick a start and an end image, place matching pairs of points on the features you want to track (the four corners lock in automatically), and generate a warp-morph between them as a sequence of frames eased in/out and appended to the frame list — see [How it works](#how-it-works)
- Warns before an accidental page reload/navigation throws away unfinished work
- Result is previewed directly on the page, with a download button
- Dark mode by default, togglable from the header menu
- Installable: works offline after the first visit, and can be added to a phone's home screen or a desktop's app list like a native app
- Mobile-first layout
- 100% client-side: no backend, no analytics, no image ever leaves the device

## How it works

New images are decoded with `createImageBitmap()` and drawn onto an in-memory `<canvas>` at full resolution — that canvas is the internal "frame".

Existing GIFs are parsed and decompressed with [gifuct-js](https://github.com/matt-way/gifuct-js). Since GIF frames often only contain a dirty rectangle and rely on the previous frame's disposal method, each frame is correctly composited onto a running canvas (handling both "restore to background" and "restore to previous") before being stored as a complete image in the frame list.

When generating the GIF, each frame is scaled proportionally to the chosen output resolution, optionally reduced to the selected color depth via simple per-channel rounding, and encoded into an animated GIF file with [gif.js](https://github.com/jnordberg/gif.js) (which uses a Web Worker for NeuQuant quantization). The finished GIF is offered as a direct download via a blob URL.

**Morphing** works by first fitting both images to the current Resolution setting, so they share the same coordinate space. The points you place (plus the four locked image corners) are connected into triangles with a small from-scratch Delaunay triangulation (Bowyer–Watson algorithm), computed once from the midpoint of each pair so the same mesh topology applies to the start image, the end image, and every in-between frame. For each frame, every triangle of the start image is affine-warped onto its interpolated shape and every triangle of the end image is warped onto that same shape, then the two warped results are cross-faded according to how far along the morph that frame is. The interpolation itself is eased in/out (cosine easing) rather than linear, so the morph starts and ends gently.

Offline support comes from a service worker (`sw.js`) that caches the app shell (`index.html`, `style.css`, `app.js`, icons, and the vendored libraries in `lib/`) using a stale-while-revalidate strategy: cached files are served instantly, while a fresh copy is fetched in the background for next time.

## Files

- `index.html` — markup
- `style.css` — all styling
- `app.js` — all app logic
- `manifest.json` — PWA manifest (name, icons, theme colors)
- `sw.js` — service worker for offline caching
- `favicon.ico`, `android-chrome-192x192.png`, `android-chrome-512x512.png` — kept at the repo root (crawler/install-prompt compatibility)
- `icons/` — `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `logo.png` (used in the header and About modal)
- `lib/` — vendored third-party libraries (see below) — **not included**, must be downloaded once, see `lib/README.md`
- Push everything to the repo root; `index.html` links to the other files with relative paths

## External libraries (vendored locally, not CDN)

- [gif.js](https://github.com/jnordberg/gif.js) `0.2.0` — GIF encoding, including its `gif.worker.js` Web Worker
- [gifuct-js](https://github.com/matt-way/gifuct-js) `2.1.2` — GIF decoding, used to edit existing GIFs; since it's only published as ES module source, it's fetched once as a self-contained bundle (see `lib/README.md`) rather than a plain `<script>`-ready file

Both are loaded from the local `lib/` folder instead of a CDN, so the app has **no external network dependency at runtime** and keeps working fully offline once the page and its assets are cached or self-hosted. See `lib/README.md` for the exact download links and where to place each file — do this once before your first deploy.

## Browser support

Works in all modern browsers (Chrome, Safari, Firefox, Edge). Formats not natively decodable by the browser's `<img>`/`<canvas>` (e.g. HEIC in most non-Safari browsers) cannot be used. GIF generation runs in a same-origin Web Worker (`lib/gif.worker.js`) and needs no network access once the page and its assets have loaded.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
