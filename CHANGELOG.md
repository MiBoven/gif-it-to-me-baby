# Changelog

All notable changes to GIF it to me Baby are documented here.

## 0.2.0 — 2026-10-31 — Design & installability overhaul

This release brings the app in line with the rest of the michels.world suite (reference: JPG75, Prepare 4 3W) and supersedes the earlier 1.0.x version numbers from before the suite's shared conventions existed — see the note at the end of this file.

- New header: clickable brand block (logo, title, subtitle) on the left; fullscreen toggle and a dropdown menu (Dark mode, Settings, About) on the right, replacing the old standalone theme-toggle button
- Added Settings and About modals (bottom-sheet style, matching JPG75's pattern)
- Installable as a PWA: `manifest.json`, app icons (192×192 / 512×512), iOS "Add to Home Screen" meta tags, and a service worker (`sw.js`) using a stale-while-revalidate cache, so the app works fully offline after the first visit and can be installed to a home screen or app list
- Added a full favicon set (`favicon.ico`, 16×16, 32×32, Apple touch icon) — icons now live in `/icons/`, with `favicon.ico` and the two PWA install icons kept at the repo root
- Added a new app icon/logo
- Split all JavaScript out of `index.html` into a separate `app.js`
- Body layout width increased from 640px to 720px to match the suite standard
- Replaced ad-hoc `style.display`/inline-style show/hide logic with the `hidden` attribute throughout, plus a global `[hidden] { display: none !important }` rule, to avoid specificity bugs
- Changelog moved out of the README into this separate file

## 0.1.0 — Initial release

This covers the app's original build, before per-app `CHANGELOG.md` files and the shared versioning convention (0.x until declared 1.0.0) were introduced — it was previously numbered 1.0.0–1.0.3. Exact original dates weren't recorded.

- Load one or more images, or an existing GIF (decoded and re-editable frame by frame)
- Configurable frame duration, output resolution, quality, and color depth
- Frame list with thumbnails, per-frame duration, reordering, and removal
- Export and download the resulting animated GIF
- 100% client-side via vendored `gif.js` and `gifuct-js` — no CDN calls at runtime, nothing ever uploaded
