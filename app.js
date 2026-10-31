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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    const scale = Math.min(outW / f.canvas.width, outH / f.canvas.height);
    const dw = f.canvas.width * scale;
    const dh = f.canvas.height * scale;
    const dx = (outW - dw) / 2;
    const dy = (outH - dh) / 2;
    ctx.drawImage(f.canvas, dx, dy, dw, dh);
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

// ---------- PWA: offline install + stale-while-revalidate caching ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  });
}
