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
- Warns before an accidental page reload/navigation throws away unfinished work
- Result is previewed directly on the page, with a download button
- Dark mode by default, with a light mode toggle
- Mobile-first layout
- 100% client-side: no backend, no analytics, no image ever leaves the device

## How it works

New images are decoded with `createImageBitmap()` and drawn onto an in-memory `<canvas>` at full resolution — that canvas is the internal "frame".

Existing GIFs are parsed and decompressed with [gifuct-js](https://github.com/matt-way/gifuct-js). Since GIF frames often only contain a dirty rectangle and rely on the previous frame's disposal method, each frame is correctly composited onto a running canvas (handling both "restore to background" and "restore to previous") before being stored as a complete image in the frame list.

When generating the GIF, each frame is scaled proportionally to the chosen output resolution, optionally reduced to the selected color depth via simple per-channel rounding, and encoded into an animated GIF file with [gif.js](https://github.com/jnordberg/gif.js) (which uses a Web Worker for NeuQuant quantization). Because dedicated Web Workers must be same-origin, the worker script is fetched from the CDN and wrapped in a `blob:` URL before being handed to gif.js — passing the CDN URL directly would make the render silently hang at 0%. The finished GIF is offered as a direct download via a blob URL.

## Files

- `index.html` — markup and app logic
- `style.css` — all styling
- `lib/` — vendored third-party libraries (see below) — **not included**, must be downloaded once, see `lib/README.md`
- Push everything to the repo root; `index.html` links to `style.css` and `lib/*` with relative paths

## External libraries (vendored locally, not CDN)

- [gif.js](https://github.com/jnordberg/gif.js) `0.2.0` — GIF encoding, including its `gif.worker.js` Web Worker
- [gifuct-js](https://github.com/matt-way/gifuct-js) `2.1.2` — GIF decoding, used to edit existing GIFs

Both files are loaded from the local `lib/` folder instead of a CDN, so the app has **no external network dependency at runtime** and keeps working fully offline once the page and its assets are cached or self-hosted. See `lib/README.md` for the exact download links and where to place each file — do this once before your first deploy.

## Deployment (Netlify)

1. Push this repository to GitHub.
2. In Netlify: **Add new site → Import an existing project**, and pick the repo.
3. Build settings: none needed — this is a static site.
   - Build command: *(leave empty)*
   - Publish directory: `/`
4. Deploy.
5. To use the `gifit.michels.world` subdomain:
   - In Netlify: **Site settings → Domain management → Add a domain** → enter `gifit.michels.world`.
   - In your DNS provider for `michels.world`, add a `CNAME` record:
     - Host: `gifit`
     - Value: `<your-site-name>.netlify.app`
   - Netlify provisions an HTTPS certificate automatically once DNS is verified.

## Browser support

Works in all modern browsers (Chrome, Safari, Firefox, Edge). Formats not natively decodable by the browser's `<img>`/`<canvas>` (e.g. HEIC in most non-Safari browsers) cannot be used. GIF generation runs in a same-origin Web Worker (`lib/gif.worker.js`) and needs no network access once the page and its assets have loaded.

## Changelog

### 1.0.2
- Vendored `gif.js`, `gif.worker.js`, and `gifuct-js` locally under `lib/` instead of loading them from a CDN, so the app has zero external network dependencies at runtime and keeps working fully offline (image processing already happened only on-device — this removes the last remaining network calls, which were for the libraries themselves)
- Removed the `fetch()` + blob-URL workaround for the worker script — it's no longer needed now that `gif.worker.js` is same-origin
- Added `lib/README.md` with exact download links and instructions for the two vendored libraries

### 1.0.1
- Fixed "Generate GIF" getting stuck at 0% regardless of image size: gif.js's Web Worker script was being loaded straight from the CDN, which browsers block for cross-origin dedicated workers. The worker script is now fetched and wrapped in a same-origin `blob:` URL before use, and a clear error is now shown if that fetch itself fails (e.g. offline)
- Added an `abort` handler so a failed/aborted render re-enables the button and shows a message instead of leaving the UI stuck
- Translated the entire UI, all code comments, and this README to English

### 1.0.0
- Initial release
- Add images (picker or drag & drop), each image becomes a GIF frame
- Load an existing GIF and split it into its individual frames (correct compositing per disposal method)
- Adjustable default options: frame duration (ms), target resolution, quality (sampling), color depth (2–256 colors), loop forever
- Frame list with per-frame duration, up/down reordering, individual removal, and "remove all"
- Warns before data loss on page reload
- GIF preview and download after generating
- Dark/light mode, mobile-first layout
