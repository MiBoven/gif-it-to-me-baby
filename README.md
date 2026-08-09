# GIF it to me Baby

Eine kleine, privacy-freundliche Web-App, die Bilder (oder ein bestehendes GIF) direkt im Browser zu einem animierten GIF zusammensetzt bzw. bearbeitet. Es wird nichts auf einen Server hochgeladen.

**Live unter:** [gifit.michels.world](https://gifit.michels.world)

## Features

- Mehrere Bilder auswählen oder per Drag & Drop hinzufügen (jedes vom Browser unterstützte Format: PNG, WEBP, JPG, BMP, …) — jedes Bild wird ein eigener GIF-Frame
- Bestehende **GIFs laden**: alle Frames werden einzeln extrahiert (inkl. korrekter Kompositierung nach Disposal-Methode) und erscheinen genauso in der Frame-Liste wie einzelne Bilder — dadurch lässt sich ein vorhandenes GIF weiterbearbeiten, kürzen, umsortieren oder mit neuen Bildern kombinieren
- Einstellbare Standardoptionen:
  - **Bildwechsel (ms pro Frame)** — Standarddauer für neu hinzugefügte Frames, pro Frame in der Liste individuell überschreibbar
  - **Auflösung (Breite × Höhe)** — wird beim ersten hinzugefügten Bild automatisch vorgeschlagen; alle Frames werden proportional eingepasst (mit weißem Rand, falls das Seitenverhältnis nicht passt)
  - **Qualität** — Sampling-Rate des Farb-Quantisierers (1 = beste Qualität/langsamer, 30 = schnell/gröber)
  - **Farbtiefe** — 2 bis 256 Farben; reduziert die Farbanzahl vor der Kodierung (vereinfachte Posterize-Quantisierung), für kleinere Dateigrößen
  - **Endlosschleife** — an/aus
- Frame-Liste mit Miniaturvorschau, individueller Dauer pro Frame, Auf/Ab-Sortierung und Entfernen einzelner Frames
- **Alle Frames entfernen** setzt die Liste komplett zurück
- Warnung vor versehentlichem Neuladen/Verlassen der Seite, solange unfertige Frames vorhanden sind
- Ergebnis wird als Vorschau direkt in der Seite angezeigt, mit Download-Button
- Dark Mode als Standard, mit Umschalter für Light Mode
- Mobile-first Layout
- 100% clientseitig: kein Backend, keine Analytics, kein Bild verlässt das Gerät

## How it works

Neue Bilder werden per `createImageBitmap()` dekodiert und auf einen In-Memory-`<canvas>` in Originalauflösung gezeichnet — das ist der interne "Frame".

Bestehende GIFs werden mit [gifuct-js](https://github.com/matt-way/gifuct-js) geparst und dekomprimiert. Da GIF-Frames oft nur einen Ausschnitt (Dirty Rect) enthalten und sich auf die vorherige Disposal-Methode verlassen, wird jeder Frame korrekt auf einem laufenden Compositing-Canvas zusammengesetzt (inkl. Behandlung von "restore to background" und "restore to previous"), bevor er als vollständiges Bild in die Frame-Liste übernommen wird.

Beim Erzeugen des GIFs wird jeder Frame proportional auf die eingestellte Zielauflösung skaliert, bei Bedarf per einfacher Farbstufen-Rundung auf die gewählte Farbtiefe reduziert, und mit [gif.js](https://github.com/jnordberg/gif.js) (inkl. Web-Worker-basierter NeuQuant-Quantisierung) zu einer animierten GIF-Datei kodiert. Das Ergebnis wird als Blob-URL direkt zum Download angeboten.

## Files

- `index.html` — Markup und App-Logik
- `style.css` — sämtliches Styling
- Beide in den Repo-Root pushen; `index.html` bindet `style.css` mit relativem Pfad ein

## Externe Bibliotheken (CDN)

- [gif.js](https://github.com/jnordberg/gif.js) `0.2.0` — GIF-Encoding (inkl. `gif.worker.js` als Web Worker)
- [gifuct-js](https://github.com/matt-way/gifuct-js) `2.1.2` — GIF-Decoding zum Bearbeiten bestehender GIFs

Beide werden über CDN eingebunden (siehe `<script>`-Tags in `index.html`). **Vor dem ersten Deploy prüfen, ob die CDN-URLs noch aktuell/erreichbar sind** — CDN-Pfade und Versionsnummern können sich ändern.

## Deployment (Netlify)

1. Repository auf GitHub pushen.
2. In Netlify: **Add new site → Import an existing project**, Repo auswählen.
3. Build-Einstellungen: keine nötig — statische Seite.
   - Build command: *(leer lassen)*
   - Publish directory: `/`
4. Deploy.
5. Für die Subdomain `gifit.michels.world`:
   - In Netlify: **Site settings → Domain management → Add a domain** → `gifit.michels.world` eintragen.
   - Beim DNS-Provider für `michels.world` einen `CNAME`-Eintrag anlegen:
     - Host: `gifit`
     - Value: `<dein-site-name>.netlify.app`
   - Netlify stellt das HTTPS-Zertifikat automatisch aus, sobald DNS verifiziert ist.

## Browser support

Funktioniert in allen modernen Browsern (Chrome, Safari, Firefox, Edge). Formate, die der Browser nicht nativ per `<img>`/`<canvas>` dekodieren kann (z. B. HEIC außerhalb von Safari), können nicht verwendet werden. Die GIF-Erzeugung läuft über einen Web Worker und benötigt daher Zugriff auf die `gif.worker.js`-Datei vom CDN.

## Changelog

### 1.0.0
- Initial release
- Bilder hinzufügen (Auswahl oder Drag & Drop), jedes Bild wird ein GIF-Frame
- Bestehende GIFs laden und in ihre Einzel-Frames zerlegen (korrektes Compositing nach Disposal-Methode)
- Einstellbare Standardoptionen: Bildwechsel (ms/Frame), Zielauflösung, Qualität (Sampling), Farbtiefe (2–256 Farben), Endlosschleife
- Frame-Liste mit individueller Frame-Dauer, Auf/Ab-Sortierung, einzelnem Entfernen und "Alle entfernen"
- Warnung vor Datenverlust bei Seiten-Reload
- GIF-Vorschau und Download nach dem Erzeugen
- Dark/Light Mode, mobile-first Layout
