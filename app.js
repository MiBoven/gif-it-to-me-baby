// ============================================================
// GIF it to me Baby — app logic
// ============================================================

// ---------- Theme ----------
const root = document.documentElement;
const darkModeSwitch = document.getElementById('darkModeSwitch');

function setTheme(t) {
  root.setAttribute('data-theme', t);
  localStorage.setItem('gifit-theme', t);
  darkModeSwitch.classList.toggle('on', t === 'dark');
}
setTheme(localStorage.getItem('gifit-theme') || 'dark');

document.getElementById('darkModeItem').addEventListener('click', () => {
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ---------- Header: brand (home), fullscreen, dropdown menu ----------
document.getElementById('brandBtn').addEventListener('click', () => {
  window.location.href = '/';
});

const fullscreenToggle = document.getElementById('fullscreenToggle');
fullscreenToggle.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
});

const menuToggle = document.getElementById('menuToggle');
const menuDropdown = document.getElementById('menuDropdown');
menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.hidden = !menuDropdown.hidden;
});
document.addEventListener('click', (e) => {
  if (!menuDropdown.hidden && !menuDropdown.contains(e.target) && e.target !== menuToggle) {
    menuDropdown.hidden = true;
  }
});

// ---------- Settings / About modals ----------
const settingsModalBg = document.getElementById('settingsModalBg');
const aboutModalBg = document.getElementById('aboutModalBg');

document.getElementById('settingsItem').addEventListener('click', () => {
  menuDropdown.hidden = true;
  settingsModalBg.hidden = false;
});
document.getElementById('closeSettings').addEventListener('click', () => { settingsModalBg.hidden = true; });
settingsModalBg.addEventListener('click', (e) => { if (e.target === settingsModalBg) settingsModalBg.hidden = true; });

document.getElementById('aboutItem').addEventListener('click', () => {
  menuDropdown.hidden = true;
  aboutModalBg.hidden = false;
});
document.getElementById('closeAbout').addEventListener('click', () => { aboutModalBg.hidden = true; });
aboutModalBg.addEventListener('click', (e) => { if (e.target === aboutModalBg) aboutModalBg.hidden = true; });

document.getElementById('resetPrefsBtn').addEventListener('click', () => {
  if (!confirm('Reset stored preferences (dark/light mode) and reload the page?')) return;
  localStorage.removeItem('gifit-theme');
  window.location.reload();
});

// ---------- Elements ----------
const drop = document.getElementById('drop');
const fileInput = document.getElementById('fileInput');
const frameDurationInput = document.getElementById('frameDuration');
const outWidthInput = document.getElementById('outWidth');
const outHeightInput = document.getElementById('outHeight');
const qualityRange = document.getElementById('quality');
const qualityLabel = document.getElementById('qualityLabel');
const colorsSelect = document.getElementById('colors');
const loopCheckbox = document.getElementById('loopInfinite');
const generateBtn = document.getElementById('generateBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const processingHint = document.getElementById('processingHint');
const frameListEl = document.getElementById('frameList');
const resultSection = document.getElementById('resultSection');
const resultImg = document.getElementById('resultImg');
const resultInfo = document.getElementById('resultInfo');
const resultDl = document.getElementById('resultDl');

let frames = [];       // { id, canvas, duration }
let frameCounter = 0;
let dimsUserEdited = false;

// Warn before an accidental reload/navigation throws away unsaved progress.
window.addEventListener('beforeunload', (e) => {
  if (frames.length > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

qualityRange.addEventListener('input', () => {
  qualityLabel.textContent = qualityRange.value;
});
outWidthInput.addEventListener('input', () => { dimsUserEdited = true; });
outHeightInput.addEventListener('input', () => { dimsUserEdited = true; });

// ---------- Drag & drop / file picking ----------
drop.addEventListener('click', () => fileInput.click());
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault(); drop.classList.add('drag');
}));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault(); drop.classList.remove('drag');
}));
drop.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => { handleFiles(e.target.files); fileInput.value = ''; });

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if (files.length === 0) {
    alert('Please choose image or GIF files.');
    return;
  }
  processingHint.hidden = false;
  processingHint.textContent = 'Loading files…';
  for (const file of files) {
    try {
      if (file.type === 'image/gif') {
        await addGifFrames(file);
      } else {
        await addImageFrame(file);
      }
    } catch (err) {
      console.error(err);
      alert(`Could not load "${file.name}".`);
    }
  }
  processingHint.hidden = true;
  renderFrames();
}

// ---------- Adding a plain image as a single frame ----------
async function addImageFrame(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  maybeAutoSetDims(canvas.width, canvas.height);
  pushFrame(canvas, parseInt(frameDurationInput.value) || 200);
}

// ---------- Adding all frames of an existing GIF, composited per disposal method ----------
async function addGifFrames(file) {
  if (!window.gifuct) {
    alert('The GIF decoder (lib/gifuct-js.esm.js) is missing or failed to load — see lib/README.md. Existing GIFs can\'t be edited without it.');
    return;
  }
  const buf = await file.arrayBuffer();
  const parsed = window.gifuct.parseGIF(buf);
  const gifFrames = window.gifuct.decompressFrames(parsed, true);
  if (gifFrames.length === 0) return;

  const gw = parsed.lsd.width;
  const gh = parsed.lsd.height;
  const composite = document.createElement('canvas');
  composite.width = gw;
  composite.height = gh;
  const cctx = composite.getContext('2d');
  let savedForRestore = null;

  maybeAutoSetDims(gw, gh);

  gifFrames.forEach(frame => {
    if (frame.disposalType === 3) {
      savedForRestore = cctx.getImageData(0, 0, gw, gh);
    }
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCanvas.getContext('2d').putImageData(
      new ImageData(frame.patch, frame.dims.width, frame.dims.height), 0, 0
    );
    cctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    // Snapshot the fully composited frame for our own frame list.
    const snap = document.createElement('canvas');
    snap.width = gw;
    snap.height = gh;
    snap.getContext('2d').drawImage(composite, 0, 0);
    const delayMs = frame.delay && frame.delay > 0 ? frame.delay : (parseInt(frameDurationInput.value) || 200);
    pushFrame(snap, delayMs);

    if (frame.disposalType === 2) {
      cctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (frame.disposalType === 3 && savedForRestore) {
      cctx.putImageData(savedForRestore, 0, 0);
    }
  });
}

function maybeAutoSetDims(w, h) {
  if (frames.length === 0 && !dimsUserEdited) {
    outWidthInput.value = w;
    outHeightInput.value = h;
  }
}

function pushFrame(canvas, duration) {
  frames.push({ id: ++frameCounter, canvas, duration });
}

// ---------- Frame list UI ----------
function renderFrames() {
  frameListEl.innerHTML = '';
  frames.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'item';

    const thumb = document.createElement('canvas');
    thumb.width = 44; thumb.height = 44;
    const tctx = thumb.getContext('2d');
    const scale = Math.min(44 / f.canvas.width, 44 / f.canvas.height);
    const tw = f.canvas.width * scale, th = f.canvas.height * scale;
    tctx.drawImage(f.canvas, (44 - tw) / 2, (44 - th) / 2, tw, th);

    const info = document.createElement('div');
    info.className = 'info';
    const label = document.createElement('div');
    label.className = 'name';
    label.textContent = `Frame ${i + 1} · ${f.canvas.width}×${f.canvas.height}`;
    const durRow = document.createElement('div');
    durRow.className = 'sizes';
    const durInput = document.createElement('input');
    durInput.type = 'number';
    durInput.min = '20';
    durInput.step = '10';
    durInput.value = f.duration;
    durInput.className = 'frame-dur';
    durInput.addEventListener('input', () => {
      f.duration = parseInt(durInput.value) || f.duration;
    });
    durRow.appendChild(durInput);
    durRow.append(' ms');
    info.appendChild(label);
    info.appendChild(durRow);

    const upBtn = document.createElement('button');
    upBtn.className = 'icon small';
    upBtn.textContent = '↑';
    upBtn.disabled = i === 0;
    upBtn.addEventListener('click', () => { moveFrame(i, -1); });

    const downBtn = document.createElement('button');
    downBtn.className = 'icon small';
    downBtn.textContent = '↓';
    downBtn.disabled = i === frames.length - 1;
    downBtn.addEventListener('click', () => { moveFrame(i, 1); });

    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.innerHTML = '&times;';
    remove.title = 'Remove';
    remove.addEventListener('click', () => {
      frames.splice(i, 1);
      renderFrames();
    });

    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(upBtn);
    row.appendChild(downBtn);
    row.appendChild(remove);
    frameListEl.appendChild(row);
  });
  updateBulkButtons();
}

function moveFrame(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= frames.length) return;
  const tmp = frames[index];
  frames[index] = frames[newIndex];
  frames[newIndex] = tmp;
  renderFrames();
}

function updateBulkButtons() {
  generateBtn.hidden = frames.length === 0;
  clearAllBtn.hidden = frames.length === 0;
}
updateBulkButtons();

clearAllBtn.addEventListener('click', () => {
  if (frames.length === 0) return;
  if (!confirm(`Remove all ${frames.length} frames? This can't be undone.`)) return;
  frames = [];
  dimsUserEdited = false;
  renderFrames();
  resultSection.hidden = true;
});

// ---------- Color depth reduction (simple uniform posterize, applied at export time only) ----------
function quantizeImageData(imageData, colors) {
  const levels = Math.max(2, Math.round(Math.cbrt(colors)));
  const step = 255 / (levels - 1);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(Math.round(d[i] / step) * step);
    d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
    d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
  }
}

// Scales `drawable` (a canvas, bitmap, or image) proportionally to fit
// inside outW×outH, padding with white — shared by GIF export and by the
// morph tool's image loading, so both resize images the same way.
function drawContainFit(ctx, drawable, srcW, srcH, outW, outH) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  const scale = Math.min(outW / srcW, outH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;
  ctx.drawImage(drawable, dx, dy, dw, dh);
}

// ---------- GIF generation ----------
generateBtn.addEventListener('click', generateGif);

function generateGif() {
  if (frames.length === 0) return;
  generateBtn.disabled = true;
  resultSection.hidden = true;
  processingHint.hidden = false;
  processingHint.textContent = 'Generating GIF… 0%';

  // gif.js spins up a dedicated Web Worker for encoding. Dedicated workers
  // must be same-origin, so workerScript points at our own local lib/
  // folder rather than a CDN — this also means rendering needs no network
  // access at all once the page itself has loaded.
  const outW = parseInt(outWidthInput.value) || 480;
  const outH = parseInt(outHeightInput.value) || 480;
  const colors = parseInt(colorsSelect.value);
  const quality = parseInt(qualityRange.value);
  const repeat = loopCheckbox.checked ? 0 : -1;

  const encoder = new GIF({
    workers: 2,
    quality,
    width: outW,
    height: outH,
    repeat,
    workerScript: 'lib/gif.worker.js'
  });

  frames.forEach(f => {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext('2d');
    drawContainFit(ctx, f.canvas, f.canvas.width, f.canvas.height, outW, outH);
    if (colors < 256) {
      const imgData = ctx.getImageData(0, 0, outW, outH);
      quantizeImageData(imgData, colors);
      ctx.putImageData(imgData, 0, 0);
    }
    encoder.addFrame(outCanvas, { delay: f.duration, copy: true });
  });

  encoder.on('progress', (p) => {
    processingHint.textContent = `Generating GIF… ${Math.round(p * 100)}%`;
  });
  encoder.on('finished', (blob) => {
    processingHint.hidden = true;
    generateBtn.disabled = false;
    showResult(blob);
  });
  encoder.on('abort', () => {
    processingHint.hidden = true;
    generateBtn.disabled = false;
    alert('GIF generation was aborted.');
  });
  encoder.render();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function showResult(blob) {
  const url = URL.createObjectURL(blob);
  resultImg.src = url;
  resultInfo.textContent = `Size: ${formatSize(blob.size)} · ${frames.length} frames`;
  resultDl.href = url;
  resultDl.download = 'gifit.gif';
  resultDl.textContent = 'Download GIF';
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// Morph: warp-morph two images into a sequence of in-between frames
// ============================================================
//
// Approach: the user places pairs of matching points on a start image (A)
// and an end image (B) — always including the four locked image corners,
// which guarantees full coverage. A single Delaunay triangulation is
// computed once, from the midpoint of each pair, and its triangle indices
// are then reused against A's positions, B's positions, and every
// in-between (interpolated) position — this is the standard way these
// "feature-based" morphs work, and it's what keeps the mesh topology
// consistent across all generated frames. For each frame, every triangle
// of A is affine-warped onto the interpolated shape, every triangle of B
// is warped onto that same shape, and the two warped images are
// cross-faded by how far along the morph that frame is.

const morphOpenBtn = document.getElementById('morphOpenBtn');
const morphBg = document.getElementById('morphBg');
const morphCloseBtn = document.getElementById('morphCloseBtn');
const morphUploadStep = document.getElementById('morphUploadStep');
const morphPointStep = document.getElementById('morphPointStep');
const morphSlotA = document.getElementById('morphSlotA');
const morphSlotB = document.getElementById('morphSlotB');
const morphFileA = document.getElementById('morphFileA');
const morphFileB = document.getElementById('morphFileB');
const morphPreviewA = document.getElementById('morphPreviewA');
const morphPreviewB = document.getElementById('morphPreviewB');
const morphPlaceholderA = document.getElementById('morphPlaceholderA');
const morphPlaceholderB = document.getElementById('morphPlaceholderB');
const morphCanvasA = document.getElementById('morphCanvasA');
const morphCanvasB = document.getElementById('morphCanvasB');
const morphPointCount = document.getElementById('morphPointCount');
const morphDeletePointBtn = document.getElementById('morphDeletePointBtn');
const morphResetPointsBtn = document.getElementById('morphResetPointsBtn');
const morphStepsInput = document.getElementById('morphSteps');
const morphProgress = document.getElementById('morphProgress');
const morphCreateBtn = document.getElementById('morphCreateBtn');
const morphResDisplay = document.getElementById('morphResDisplay');
const morphModeWarp = document.getElementById('morphModeWarp');
const morphModeFade = document.getElementById('morphModeFade');
const morphPointsArea = document.getElementById('morphPointsArea');
const morphFadeHint = document.getElementById('morphFadeHint');
const morphPreviewBtn = document.getElementById('morphPreviewBtn');
const morphPreviewBox = document.getElementById('morphPreviewBox');
const morphPreviewCanvas = document.getElementById('morphPreviewCanvas');

let morphImgA = null;   // { canvas } — pristine, fitted to outW×outH, never drawn on
let morphImgB = null;
let morphPoints = [];   // [{ ax, ay, bx, by, locked }] — index pairs A/B positions
let morphSelectedIndex = -1;
let morphDrag = null;   // { index, side }
let morphMode = 'warp';  // 'warp' (control points) or 'fade' (plain crossfade)
let morphPlayTimer = null;
let morphPreviewUrlA = null;
let morphPreviewUrlB = null;

morphOpenBtn.addEventListener('click', () => {
  morphImgA = null;
  morphImgB = null;
  morphPoints = [];
  morphSelectedIndex = -1;
  morphDrag = null;
  setMorphMode('warp');

  [morphSlotA, morphSlotB].forEach(slot => slot.classList.remove('filled'));
  [morphPreviewA, morphPreviewB].forEach(img => { img.hidden = true; });
  [morphPlaceholderA, morphPlaceholderB].forEach(el => { el.hidden = false; });
  morphPlaceholderA.textContent = 'Tap to choose start image';
  morphPlaceholderB.textContent = 'Tap to choose end image';

  const outW = parseInt(outWidthInput.value) || 480;
  const outH = parseInt(outHeightInput.value) || 480;
  morphResDisplay.textContent = `${outW}×${outH}px`;

  morphUploadStep.hidden = false;
  morphPointStep.hidden = true;
  morphBg.hidden = false;
});

function closeMorphEditor() {
  stopMorphPreview();
  morphBg.hidden = true;
}

function setMorphMode(mode) {
  morphMode = mode;
  stopMorphPreview();
  morphModeWarp.classList.toggle('active', mode === 'warp');
  morphModeFade.classList.toggle('active', mode === 'fade');
  morphPointsArea.hidden = mode !== 'warp';
  morphFadeHint.hidden = mode !== 'fade';
}
morphModeWarp.addEventListener('click', () => setMorphMode('warp'));
morphModeFade.addEventListener('click', () => setMorphMode('fade'));

function stopMorphPreview() {
  if (morphPlayTimer) { clearInterval(morphPlayTimer); morphPlayTimer = null; }
  morphPreviewBtn.textContent = '▶ Preview';
}
morphCloseBtn.addEventListener('click', closeMorphEditor);
morphBg.addEventListener('click', (e) => { if (e.target === morphBg) closeMorphEditor(); });

morphSlotA.addEventListener('click', () => morphFileA.click());
morphSlotB.addEventListener('click', () => morphFileB.click());
morphFileA.addEventListener('change', () => { handleMorphUpload('a', morphFileA.files[0]); morphFileA.value = ''; });
morphFileB.addEventListener('change', () => { handleMorphUpload('b', morphFileB.files[0]); morphFileB.value = ''; });

async function handleMorphUpload(side, file) {
  if (!file) return;
  const outW = parseInt(outWidthInput.value) || 480;
  const outH = parseInt(outHeightInput.value) || 480;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    alert(`Could not load "${file.name}" as an image.`);
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  drawContainFit(canvas.getContext('2d'), bitmap, bitmap.width, bitmap.height, outW, outH);
  bitmap.close();

  const slot = side === 'a' ? morphSlotA : morphSlotB;
  const preview = side === 'a' ? morphPreviewA : morphPreviewB;
  const placeholder = side === 'a' ? morphPlaceholderA : morphPlaceholderB;

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    if (side === 'a') { if (morphPreviewUrlA) URL.revokeObjectURL(morphPreviewUrlA); morphPreviewUrlA = url; }
    else { if (morphPreviewUrlB) URL.revokeObjectURL(morphPreviewUrlB); morphPreviewUrlB = url; }
    preview.src = url;
    preview.hidden = false;
    placeholder.hidden = true;
    slot.classList.add('filled');
  });

  if (side === 'a') morphImgA = { canvas }; else morphImgB = { canvas };

  if (morphImgA && morphImgB) {
    startMorphPointEditor(outW, outH);
  }
}

function initMorphPoints(w, h) {
  return [
    { ax: 0, ay: 0, bx: 0, by: 0, locked: true },
    { ax: w, ay: 0, bx: w, by: 0, locked: true },
    { ax: w, ay: h, bx: w, by: h, locked: true },
    { ax: 0, ay: h, bx: 0, by: h, locked: true }
  ];
}

function startMorphPointEditor(outW, outH) {
  morphPoints = initMorphPoints(outW, outH);
  morphSelectedIndex = -1;
  morphCanvasA.width = outW;
  morphCanvasA.height = outH;
  morphCanvasB.width = outW;
  morphCanvasB.height = outH;
  morphUploadStep.hidden = true;
  morphPointStep.hidden = false;
  renderMorphEditorCanvases();
}

function renderMorphEditorCanvases() {
  drawMorphSide(morphCanvasA, morphImgA.canvas, 'a');
  drawMorphSide(morphCanvasB, morphImgB.canvas, 'b');
  const extra = morphPoints.length - 4;
  morphPointCount.textContent = extra === 1 ? '1 point pair added.' : `${extra} point pairs added.`;
  morphDeletePointBtn.disabled = morphSelectedIndex === -1;
}

function drawMorphSide(canvas, baseCanvas, side) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvas, 0, 0);
  morphPoints.forEach((p, i) => {
    const x = side === 'a' ? p.ax : p.bx;
    const y = side === 'a' ? p.ay : p.by;
    const selected = i === morphSelectedIndex;
    ctx.beginPath();
    ctx.arc(x, y, selected ? 9 : 7, 0, Math.PI * 2);
    ctx.fillStyle = p.locked ? 'rgba(160,160,160,0.85)' : (selected ? '#ffffff' : '#4f8cff');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = selected ? '#4f8cff' : 'rgba(0,0,0,0.5)';
    ctx.stroke();
  });
}

function morphCanvasCoords(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: Math.max(0, Math.min(canvas.width, (evt.clientX - rect.left) * scaleX)),
    y: Math.max(0, Math.min(canvas.height, (evt.clientY - rect.top) * scaleY))
  };
}

function hitTestMorphPoint(side, x, y) {
  const threshold = 16; // canvas px
  let best = -1;
  let bestDist = threshold;
  morphPoints.forEach((p, i) => {
    const px = side === 'a' ? p.ax : p.bx;
    const py = side === 'a' ? p.ay : p.by;
    const dist = Math.hypot(px - x, py - y);
    if (dist < bestDist) { bestDist = dist; best = i; }
  });
  return best;
}

function setupMorphCanvasInteraction(canvas, side) {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const { x, y } = morphCanvasCoords(canvas, e);
    const hit = hitTestMorphPoint(side, x, y);

    if (hit !== -1 && morphPoints[hit].locked) {
      return; // locked corners can't be selected, moved, or deleted
    }
    if (hit !== -1) {
      morphSelectedIndex = hit;
      morphDrag = { index: hit, side };
    } else {
      morphPoints.push({ ax: x, ay: y, bx: x, by: y, locked: false });
      morphSelectedIndex = morphPoints.length - 1;
      morphDrag = { index: morphSelectedIndex, side };
    }
    canvas.setPointerCapture(e.pointerId);
    renderMorphEditorCanvases();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!morphDrag || morphDrag.side !== side) return;
    const { x, y } = morphCanvasCoords(canvas, e);
    const p = morphPoints[morphDrag.index];
    if (side === 'a') { p.ax = x; p.ay = y; } else { p.bx = x; p.by = y; }
    renderMorphEditorCanvases();
  });

  function endDrag() {
    if (morphDrag && morphDrag.side === side) morphDrag = null;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}
setupMorphCanvasInteraction(morphCanvasA, 'a');
setupMorphCanvasInteraction(morphCanvasB, 'b');

morphDeletePointBtn.addEventListener('click', () => {
  if (morphSelectedIndex === -1) return;
  morphPoints.splice(morphSelectedIndex, 1);
  morphSelectedIndex = -1;
  renderMorphEditorCanvases();
});

morphResetPointsBtn.addEventListener('click', () => {
  if (morphPoints.length <= 4) return;
  if (!confirm('Remove all added points (keeping just the 4 locked corners)?')) return;
  morphPoints = initMorphPoints(morphCanvasA.width, morphCanvasA.height);
  morphSelectedIndex = -1;
  renderMorphEditorCanvases();
});

// ---------- Delaunay triangulation (Bowyer–Watson) ----------
// Returns a list of [i, j, k] index triples into `points`.
function delaunayTriangulate(points) {
  const n = points.length;
  if (n < 3) return [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const deltaMax = Math.max(maxX - minX, maxY - minY, 1) * 10;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // A super-triangle big enough to contain every point, removed at the end.
  const pts = points.concat([
    { x: midX - deltaMax, y: midY - deltaMax },
    { x: midX, y: midY + deltaMax },
    { x: midX + deltaMax, y: midY - deltaMax }
  ]);
  const superIdx = [n, n + 1, n + 2];

  // Standard Guibas–Stolfi in-circle predicate, orientation-aware so it
  // works regardless of each triangle's vertex winding order.
  function circumcircleContains(tri, p) {
    const [A, B, C] = tri.map(i => pts[i]);
    const ax = A.x - p.x, ay = A.y - p.y;
    const bx = B.x - p.x, by = B.y - p.y;
    const cx = C.x - p.x, cy = C.y - p.y;

    const det =
      (ax * ax + ay * ay) * (bx * cy - by * cx) -
      (bx * bx + by * by) * (ax * cy - ay * cx) +
      (cx * cx + cy * cy) * (ax * by - ay * bx);

    const orient = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
    return orient > 0 ? det > 1e-9 : det < -1e-9;
  }

  function edgeKey(a, b) { return a < b ? a + '_' + b : b + '_' + a; }

  let triangles = [[...superIdx]];

  for (let pi = 0; pi < n; pi++) {
    const badTriangles = triangles.filter(tri => circumcircleContains(tri, pts[pi]));

    const edgeCount = new Map();
    for (const tri of badTriangles) {
      const edges = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
      for (const [a, b] of edges) {
        const key = edgeKey(a, b);
        edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
      }
    }
    const boundary = [];
    for (const tri of badTriangles) {
      const edges = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
      for (const [a, b] of edges) {
        if (edgeCount.get(edgeKey(a, b)) === 1) boundary.push([a, b]);
      }
    }

    triangles = triangles.filter(tri => !badTriangles.includes(tri));
    for (const [a, b] of boundary) {
      triangles.push([a, b, pi]);
    }
  }

  return triangles.filter(tri => !tri.some(i => superIdx.includes(i)));
}

// ---------- Per-triangle affine warp ----------
// 3x3 determinant via cofactor expansion along the first row.
function det3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

// Solves P * [x,y,e]^T = rhs for one axis via Cramer's rule, where P's rows
// are [srcX, srcY, 1] for each of the 3 triangle corners.
function solveAffineAxis(P, rhs) {
  const D = det3(P);
  if (Math.abs(D) < 1e-10) return null;
  const Pa = [[rhs[0], P[0][1], P[0][2]], [rhs[1], P[1][1], P[1][2]], [rhs[2], P[2][1], P[2][2]]];
  const Pc = [[P[0][0], rhs[0], P[0][2]], [P[1][0], rhs[1], P[1][2]], [P[2][0], rhs[2], P[2][2]]];
  const Pe = [[P[0][0], P[0][1], rhs[0]], [P[1][0], P[1][1], rhs[1]], [P[2][0], P[2][1], rhs[2]]];
  return [det3(Pa) / D, det3(Pc) / D, det3(Pe) / D];
}

// Finds the affine matrix {a,b,c,d,e,f} mapping src triangle -> dst triangle,
// for use with ctx.transform(a,b,c,d,e,f).
function computeAffine(src, dst) {
  const P = [
    [src[0].x, src[0].y, 1],
    [src[1].x, src[1].y, 1],
    [src[2].x, src[2].y, 1]
  ];
  const sol1 = solveAffineAxis(P, [dst[0].x, dst[1].x, dst[2].x]);
  if (!sol1) return null;
  const sol2 = solveAffineAxis(P, [dst[0].y, dst[1].y, dst[2].y]);
  if (!sol2) return null;
  return { a: sol1[0], c: sol1[1], e: sol1[2], b: sol2[0], d: sol2[1], f: sol2[2] };
}

function drawWarpedTriangle(ctx, image, srcTri, dstTri) {
  const m = computeAffine(srcTri, dstTri);
  if (!m) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dstTri[0].x, dstTri[0].y);
  ctx.lineTo(dstTri[1].x, dstTri[1].y);
  ctx.lineTo(dstTri[2].x, dstTri[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

// Cosine-based ease-in-out: starts and ends the morph gently.
function easeInOut(t) {
  return (1 - Math.cos(Math.PI * t)) / 2;
}

function renderMorphFrame(t, triangles, ptsA, ptsB, canvasA, canvasB, outW, outH) {
  const interp = ptsA.map((pa, i) => {
    const pb = ptsB[i];
    return { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t };
  });

  const layerA = document.createElement('canvas');
  layerA.width = outW;
  layerA.height = outH;
  const ctxA = layerA.getContext('2d');
  for (const tri of triangles) {
    drawWarpedTriangle(ctxA, canvasA, tri.map(i => ptsA[i]), tri.map(i => interp[i]));
  }

  const layerB = document.createElement('canvas');
  layerB.width = outW;
  layerB.height = outH;
  const ctxB = layerB.getContext('2d');
  for (const tri of triangles) {
    drawWarpedTriangle(ctxB, canvasB, tri.map(i => ptsB[i]), tri.map(i => interp[i]));
  }

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.globalAlpha = 1 - t;
  ctx.drawImage(layerA, 0, 0);
  ctx.globalAlpha = t;
  ctx.drawImage(layerB, 0, 0);
  ctx.globalAlpha = 1;

  return out;
}

// Plain crossfade: no warping, just blend start into end.
function renderFadeFrame(t, canvasA, canvasB, outW, outH) {
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.globalAlpha = 1 - t;
  ctx.drawImage(canvasA, 0, 0);
  ctx.globalAlpha = t;
  ctx.drawImage(canvasB, 0, 0);
  ctx.globalAlpha = 1;
  return out;
}

// Builds all frames for the current mode. Returns null if it can't (bad triangulation).
async function buildMorphFrames() {
  const steps = Math.max(2, Math.min(60, parseInt(morphStepsInput.value) || 10));
  const outW = morphCanvasA.width;
  const outH = morphCanvasA.height;

  let ptsA, ptsB, triangles;
  if (morphMode === 'warp') {
    ptsA = morphPoints.map(p => ({ x: p.ax, y: p.ay }));
    ptsB = morphPoints.map(p => ({ x: p.bx, y: p.by }));
    const midPts = morphPoints.map(p => ({ x: (p.ax + p.bx) / 2, y: (p.ay + p.by) / 2 }));
    triangles = delaunayTriangulate(midPts);
    if (triangles.length === 0) {
      alert('Could not triangulate these points — try moving a point so it is not exactly on a straight line with the others.');
      return null;
    }
  }

  const totalFrames = steps + 2; // includes the start (t=0) and end (t=1) frames
  const frames = [];
  for (let i = 0; i < totalFrames; i++) {
    morphProgress.textContent = `Rendering frame ${i + 1} of ${totalFrames}…`;
    // Yield a tick so the UI stays responsive between synchronous canvas renders.
    await new Promise(resolve => setTimeout(resolve, 0));
    const t = easeInOut(i / (totalFrames - 1));
    frames.push(morphMode === 'warp'
      ? renderMorphFrame(t, triangles, ptsA, ptsB, morphImgA.canvas, morphImgB.canvas, outW, outH)
      : renderFadeFrame(t, morphImgA.canvas, morphImgB.canvas, outW, outH));
  }
  return frames;
}

morphPreviewBtn.addEventListener('click', async () => {
  if (morphPlayTimer) { stopMorphPreview(); return; }
  morphPreviewBtn.disabled = true;
  morphCreateBtn.disabled = true;
  morphProgress.hidden = false;
  const frames = await buildMorphFrames();
  morphProgress.hidden = true;
  morphPreviewBtn.disabled = false;
  morphCreateBtn.disabled = false;
  if (!frames) return;

  morphPreviewCanvas.width = frames[0].width;
  morphPreviewCanvas.height = frames[0].height;
  morphPreviewBox.hidden = false;
  const pctx = morphPreviewCanvas.getContext('2d');
  const duration = Math.max(20, parseInt(frameDurationInput.value) || 200);
  let i = 0, dir = 1; // ping-pong so the loop doesn't jump from end back to start
  morphPreviewBtn.textContent = '■ Stop';
  morphPlayTimer = setInterval(() => {
    pctx.drawImage(frames[i], 0, 0);
    if (i + dir < 0 || i + dir >= frames.length) dir = -dir;
    i += dir;
  }, duration);
});

morphCreateBtn.addEventListener('click', createMorphFrames);

async function createMorphFrames() {
  stopMorphPreview();
  morphCreateBtn.disabled = true;
  morphPreviewBtn.disabled = true;
  morphProgress.hidden = false;

  const frames = await buildMorphFrames();

  morphProgress.hidden = true;
  morphCreateBtn.disabled = false;
  morphPreviewBtn.disabled = false;
  if (!frames) return;

  const duration = parseInt(frameDurationInput.value) || 200;
  frames.forEach(canvas => pushFrame(canvas, duration));
  renderFrames();
  closeMorphEditor();
}

// ---------- PWA: offline install + stale-while-revalidate caching ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  });
}
