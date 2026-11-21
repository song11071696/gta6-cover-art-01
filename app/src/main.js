// Vice Coast Cover Studio — UI wiring.
// Loads photos (file picker, drag-and-drop, built-in samples), keeps the cover
// state, and draws the live preview with the same renderCover the exports use.
// ?shot= modes (./shots.js) set up fixed scenes for screenshots.
import { GRADES, LAYOUTS, DEFAULT_STATE, freshPanels, renderCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

const state = {
  ...DEFAULT_STATE,
  panels: freshPanels(DEFAULT_STATE.layout, 0),
};
let photos = []; // HTMLImageElement list, in load order
let photoNames = [];
let selectedPanel = 0;
let selectedPhoto = 0;

function redraw() {
  renderCover(canvas, photos, state);
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel] || { photo: 0, zoom: 1 };
  const select = $('panel-photo');
  select.innerHTML = '';
  photoNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${name}`;
    select.appendChild(opt);
  });
  if (!photoNames.length) {
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = 'No photo yet — try a sample';
    select.appendChild(opt);
  }
  select.value = String(panel.photo || 0);
  $('zoom').value = String(panel.zoom || 1);
  $('zoom-val').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  document.querySelectorAll('#thumbs img').forEach((img, i) => {
    img.classList.toggle('selected', i === (panel.photo || 0));
  });
}

function syncThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  photos.forEach((img, i) => {
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = photoNames[i] || `Photo ${i + 1}`;
    t.classList.toggle('selected', i === selectedPhoto);
    t.addEventListener('click', () => {
      selectedPhoto = i;
      if (state.panels[selectedPanel]) state.panels[selectedPanel].photo = i;
      syncPanelControls();
      syncThumbs();
      redraw();
    });
    box.appendChild(t);
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 4 - photos.length);
  for (const file of list) {
    const img = await loadImage(URL.createObjectURL(file));
    photos.push(img);
    photoNames.push(file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
  }
  if (photos.length && !state.panels.length) {
    state.panels = freshPanels(state.layout, photos.length);
  } else if (photos.length) {
    state.panels.forEach((p) => { if (p.photo >= photos.length) p.photo = 0; });
  }
  selectedPhoto = Math.max(0, photos.length - 1);
  syncThumbs();
  syncPanelControls();
  redraw();
  status.textContent = photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} loaded.` : '';
}

async function loadSamples() {
  if (photos.length) return;
  for (const [file, name] of [['samples/boulevard.jpg', 'Boulevard'], ['samples/pier.jpg', 'Pier']]) {
    const img = await loadImage(file);
    photos.push(img);
    photoNames.push(name);
  }
  state.panels = freshPanels(state.layout, photos.length);
  syncThumbs();
  syncPanelControls();
  redraw();
}

// ---- Layout + grade pickers ----
function buildPills(containerId, items, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  Object.entries(items).forEach(([key, item]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.name;
    b.classList.toggle('active', key === current);
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    });
    box.appendChild(b);
  });
}

buildPills('layouts', LAYOUTS, state.layout, (key) => {
  state.layout = key;
  state.panels = freshPanels(key, photos.length);
  selectedPanel = 0;
  syncPanelControls();
  redraw();
});
buildPills('grades', GRADES, state.grade, (key) => {
  state.grade = key;
  redraw();
});

// ---- Panel editing: click to select, drag to pan ----
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const [x, y, w, h] = layout.panels[i];
    if (fx >= x && fx <= x + w && fy >= y && fy <= y + h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selectedPanel = i;
  const panel = state.panels[i];
  selectedPhoto = panel.photo || 0;
  syncPanelControls();
  syncThumbs();
  redraw();
  drag = { x: e.clientX, y: e.clientY, panX: panel.panX || 0, panY: panel.panY || 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[selectedPanel];
  panel.panX = drag.panX + (e.clientX - drag.x) / rect.width;
  panel.panY = drag.panY + (e.clientY - drag.y) / rect.height;
  panel.panX = Math.max(-0.4, Math.min(0.4, panel.panX));
  panel.panY = Math.max(-0.4, Math.min(0.4, panel.panY));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// ---- Controls ----
$('photo-input').addEventListener('change', (e) => addFiles(e.target.files));
const dropzone = $('dropzone');
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('over');
  addFiles(e.dataTransfer.files);
});
$('sample-btn').addEventListener('click', async () => {
  await loadSamples();
  status.textContent = 'Sample photos loaded — pick a layout and export.';
});

$('panel-photo').addEventListener('change', (e) => {
  if (state.panels[selectedPanel]) state.panels[selectedPanel].photo = Number(e.target.value);
  selectedPhoto = Number(e.target.value);
  syncThumbs();
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  if (state.panels[selectedPanel]) state.panels[selectedPanel].zoom = Number(e.target.value);
  $('zoom-val').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
  redraw();
});
$('flip-btn').addEventListener('click', () => {
  const panel = state.panels[selectedPanel];
  if (panel) { panel.flip = !panel.flip; redraw(); }
});
$('reset-panel').addEventListener('click', () => {
  const panel = state.panels[selectedPanel];
  if (panel) { panel.zoom = 1; panel.panX = 0; panel.panY = 0; panel.flip = false; }
  syncPanelControls();
  redraw();
});
$('intensity').addEventListener('input', (e) => {
  state.intensity = Number(e.target.value);
  $('intensity-val').textContent = `${Math.round(state.intensity * 100)}%`;
  redraw();
});
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('caption-size').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  $('caption-size-val').textContent = `${Math.round(state.captionSize * 100)}%`;
  redraw();
});
$('caption-pos').addEventListener('change', (e) => { state.captionPos = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });

// ---- Export: same renderCover, offscreen canvas at the target size ----
function exportCover(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  renderCover(off, photos, state);
  return off;
}

function downloadCanvas(off, name) {
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    status.textContent = `Saved ${name}`;
  }, 'image/png');
}

// Exposed for screenshots: returns the exported PNG as a data URL.
window.__exportCover = async (width, height) => {
  await document.fonts.ready;
  const off = exportCover(width, height);
  return off.toDataURL('image/png');
};
window.__getState = () => JSON.parse(JSON.stringify(state));
// Exposed for shot modes: point one panel at a photo by index.
window.__setPanelPhoto = (panelIndex, photoIndex) => {
  if (state.panels[panelIndex]) state.panels[panelIndex].photo = photoIndex;
};

$('export-square').addEventListener('click', () => downloadCanvas(exportCover(1080, 1080), 'vice-coast-1080x1080.png'));
$('export-portrait').addEventListener('click', () => downloadCanvas(exportCover(1080, 1350), 'vice-coast-1080x1350.png'));
$('export-wide').addEventListener('click', () => downloadCanvas(exportCover(1920, 1080), 'vice-coast-1920x1080.png'));
$('export-all').addEventListener('click', () => {
  downloadCanvas(exportCover(1080, 1080), 'vice-coast-1080x1080.png');
  downloadCanvas(exportCover(1080, 1350), 'vice-coast-1080x1350.png');
  downloadCanvas(exportCover(1920, 1080), 'vice-coast-1920x1080.png');
});

// ---- Shot modes + first paint ----
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, {
    loadSamples,
    loadImage,
    setCaption: (text) => { state.caption = text; $('caption').value = text; },
    setLayout: (key) => { state.layout = key; state.panels = freshPanels(key, photos.length); },
    setGrade: (key) => { state.grade = key; },
    photos: () => photos,
    redraw,
  });
} else {
  loadSamples().then(() => { status.textContent = 'Sample photos loaded — or add your own.'; });
}
syncPanelControls();
redraw();
