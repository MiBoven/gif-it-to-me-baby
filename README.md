# lib/

This app depends on two small third-party libraries. They must live in this
folder as plain local files — **not** loaded from a CDN — so the app has no
external network dependency at runtime and keeps working fully offline.

Download these files once and place them here, keeping the exact filenames:

| File to save as | Download from |
|---|---|
| `lib/gif.js` | https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js |
| `lib/gif.worker.js` | https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js |
| `lib/gifuct-js.esm.js` | https://esm.sh/gifuct-js@2.1.2?standalone |

**Note on `gifuct-js.esm.js`:** `gifuct-js` is only published on npm as ES
module source — there is no ready-made `dist/*.min.js` build to download, so
a plain `<script src="...">` tag won't work with a file straight from
npm/unpkg. The `esm.sh` URL above generates a single, self-contained ES
module file with its one small dependency (`js-binary-schema-parser`)
bundled in, so no further network requests happen when it runs. Save
whatever that URL returns as `lib/gifuct-js.esm.js` — a browser "Save As"
or `curl`/`wget` both work fine, it's just a `.js` text file.

`gif.js` (MIT license, https://github.com/jnordberg/gif.js) does the actual GIF
encoding using a Web Worker — that worker is `gif.worker.js`, which is never
loaded via a `<script>` tag, only referenced by path in `index.html` as
`workerScript: 'lib/gif.worker.js'`.

`gifuct-js` (MIT license, https://github.com/matt-way/gifuct-js) decodes an
existing GIF's individual frames so they can be loaded into the frame list
and edited. `index.html` loads it as a module and exposes it as
`window.gifuct = { parseGIF, decompressFrames }` for the rest of the app to use.

After downloading, commit all three files to the repository alongside
`index.html` and `style.css`. Once they're in place, the whole app — including
generating and loading GIFs — runs with zero network requests; only the very
first page load (fetching `index.html`, `style.css`, and the files in `lib/`)
needs a connection, exactly like any other static site.
