// Vice Coast Cover Studio — render engine.
// One function, renderCover, draws a whole multi-panel poster onto any canvas:
// sky + sun + skyline, photo panels with per-panel crop/pan/flip, a colour grade,
// halftone grain, palm silhouettes, and big gradient caption lettering.
// The live preview and the PNG exports both call this same function, so what
// you see on screen is exactly what the exported file holds.

// ---- Grades: each one is a sky, a photo tint and a caption gradient. ----
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    sky: ['#ffcf5c', '#ff7a3d', '#ff2e88', '#3b0f54'],
    sun: '#fff3b0', sunGlow: 'rgba(255, 180, 80, 0.85)',
    tint: ['rgba(255, 110, 60, 0.16)', 'rgba(255, 40, 130, 0.30)'],
    caption: ['#fff6c9', '#ffb347', '#ff2e88'],
    band: '#1c0b2e',
  },
  neon: {
    name: 'Neon Night',
    sky: ['#0b0620', '#3b0f6e', '#b01e8f', '#00e5ff'],
    sun: '#7df9ff', sunGlow: 'rgba(0, 229, 255, 0.8)',
    tint: ['rgba(0, 229, 255, 0.14)', 'rgba(255, 0, 170, 0.32)'],
    caption: ['#d8fbff', '#00e5ff', '#ff00aa'],
    band: '#07031a',
  },
  pastel: {
    name: 'Pastel Day',
    sky: ['#fff3e0', '#ffd6e8', '#a8d8ff', '#7fa8e0'],
    sun: '#fffbe8', sunGlow: 'rgba(255, 214, 120, 0.8)',
    tint: ['rgba(255, 180, 210, 0.14)', 'rgba(120, 180, 255, 0.18)'],
    caption: ['#ffffff', '#ffd6e8', '#ff7ab8'],
    band: '#274060',
  },
  ember: {
    name: 'Ember Dusk',
    sky: ['#2b0a1e', '#7a1030', '#e8481f', '#ffb347'],
    sun: '#ffd166', sunGlow: 'rgba(255, 140, 40, 0.85)',
    tint: ['rgba(255, 90, 20, 0.20)', 'rgba(120, 10, 60, 0.34)'],
    caption: ['#fff3d6', '#ff9e3d', '#e8481f'],
    band: '#16060f',
  },
};

// ---- Layouts: panel rects as fractions of the canvas (x, y, w, h). ----
// The caption band lives at the bottom; panels sit above it. Every layout
// leaves a strip of sky visible so the sun and skyline always show.
export const LAYOUTS = {
  keyart: {
    name: 'Key Art',
    panels: [
      [0.03, 0.15, 0.58, 0.53],
      [0.64, 0.15, 0.33, 0.26],
      [0.64, 0.42, 0.33, 0.26],
    ],
  },
  five: {
    name: 'Five Panel',
    panels: [
      [0.03, 0.15, 0.27, 0.25],
      [0.70, 0.15, 0.27, 0.25],
      [0.30, 0.13, 0.40, 0.38],
      [0.03, 0.41, 0.27, 0.25],
      [0.70, 0.41, 0.27, 0.25],
    ],
  },
  duo: {
    name: 'Split Duo',
    panels: [
      [0.03, 0.15, 0.46, 0.53],
      [0.51, 0.15, 0.46, 0.53],
    ],
  },
  hero: {
    name: 'Single Hero',
    panels: [[0.03, 0.15, 0.94, 0.53]],
  },
};

export const DEFAULT_STATE = {
  layout: 'five',
  grade: 'sunset',
  intensity: 0.85,
  grain: true,
  caption: 'VICE COAST',
  tagline: 'CHASE THE SUNSET',
  badge: 'VICE CITY • EST. 2026',
  captionSize: 1.0,
  captionPos: 'bottom', // 'bottom' | 'top'
  panels: [], // one entry per layout panel: { photo, zoom, panX, panY, flip }
};

export function freshPanels(layoutKey, photoCount) {
  const n = LAYOUTS[layoutKey].panels.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      photo: photoCount ? i % photoCount : 0,
      zoom: 1,
      panX: 0,
      panY: 0,
      flip: false,
    });
  }
  return out;
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawSun(ctx, w, h, grade, intensity) {
  // The sun hangs in the open sky strip above the panels, so it is never
  // hidden behind them; its lower edge just tucks behind the top panels.
  const cx = w * 0.5;
  const cy = h * 0.085;
  const r = Math.min(w, h) * 0.075;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.5, cy - r * 2.5, r * 5, r * 5);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Retro slats cut across the low sun.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.sky[3];
  let y = cy + r * 0.05;
  let gap = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap * 0.55);
    y += gap;
    gap *= 1.35;
  }
  ctx.restore();
  void intensity;
}

function drawSkyline(ctx, w, h, grade) {
  const base = h * 0.70;
  ctx.fillStyle = 'rgba(20, 6, 34, 0.85)';
  // Deterministic pseudo-random skyline so every size renders the same.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let x = 0;
  while (x < w) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = h * (0.03 + rnd() * 0.10);
    ctx.fillRect(x, base - bh, bw, bh + h * 0.02);
    if (rnd() > 0.6) {
      ctx.fillRect(x + bw * 0.3, base - bh - h * 0.02, bw * 0.12, h * 0.02);
    }
    x += bw + w * 0.004;
  }
  // Lit windows: tiny warm dots on the towers.
  ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
  seed = 11;
  for (let i = 0; i < 90; i++) {
    const wx = rnd() * w;
    const wy = base - rnd() * h * 0.11;
    ctx.fillRect(wx, wy, Math.max(1.5, w * 0.002), Math.max(1.5, w * 0.002));
  }
}

function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.strokeStyle = 'rgba(12, 4, 24, 0.95)';
  ctx.fillStyle = 'rgba(12, 4, 24, 0.95)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -60, 22, -105);
  ctx.stroke();
  // Fronds fanning from the trunk tip.
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    const len = 62 - Math.abs(i - 3) * 7;
    ctx.beginPath();
    ctx.moveTo(22, -105);
    ctx.quadraticCurveTo(
      22 + Math.cos(a) * len * 0.6, -105 + Math.sin(a) * len * 0.55 - 14,
      22 + Math.cos(a) * len, -105 + Math.sin(a) * len + 16,
    );
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(16, -98, 6, 0, Math.PI * 2);
  ctx.arc(28, -96, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHalftone(ctx, w, h, grade, intensity) {
  ctx.save();
  ctx.globalAlpha = 0.16 * intensity;
  ctx.fillStyle = grade.sky[3];
  const step = Math.max(7, w * 0.012);
  for (let y = h * 0.72; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const r = step * 0.16 * (1 + (y - h * 0.72) / (h * 0.28));
      ctx.beginPath();
      ctx.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGrain(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000';
  let seed = 1234567;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2600; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
  }
  ctx.restore();
}

function drawPhotoPanel(ctx, x, y, w, h, photo, panel, grade, intensity) {
  ctx.save();
  rr(ctx, x, y, w, h, Math.min(w, h) * 0.02);
  ctx.clip();
  if (photo) {
    const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    const cx = x + w / 2 + (panel.panX || 0) * w;
    const cy = y + h / 2 + (panel.panY || 0) * h;
    if (panel.flip) {
      ctx.translate(cx * 2, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
    if (panel.flip) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
  } else {
    ctx.fillStyle = '#3a1440';
    ctx.fillRect(x, y, w, h);
  }
  // Grade wash over the photo.
  const wash = ctx.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, grade.tint[0]);
  wash.addColorStop(1, grade.tint[1]);
  ctx.globalAlpha = intensity;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  // Inner shade so the panel edges read as separate plates.
  const edge = ctx.createLinearGradient(x, y, x, y + h);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Thick poster border with a thin neon inner line.
  ctx.save();
  rr(ctx, x, y, w, h, Math.min(w, h) * 0.02);
  ctx.lineWidth = Math.max(3, w * 0.012);
  ctx.strokeStyle = '#f5f0ff';
  ctx.stroke();
  ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.strokeStyle = grade.caption[1];
  rr(ctx, x + w * 0.008, y + h * 0.008, w * 0.984, h * 0.984, Math.min(w, h) * 0.015);
  ctx.stroke();
  ctx.restore();
}

function drawCaption(ctx, w, h, state, grade) {
  const bandH = h * 0.30;
  const bandY = state.captionPos === 'top' ? 0 : h - bandH;
  const text = (state.caption || 'VICE COAST').trim().toUpperCase() || 'VICE COAST';
  const tagline = (state.tagline || '').trim().toUpperCase();
  const badge = (state.badge || '').trim().toUpperCase();

  // Caption band: dark glass strip the lettering sits on.
  ctx.save();
  ctx.fillStyle = grade.band;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, bandY, w, bandH);
  ctx.globalAlpha = 1;
  const bandEdge = ctx.createLinearGradient(0, bandY, 0, bandY + 4);
  bandEdge.addColorStop(0, grade.caption[1]);
  bandEdge.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bandEdge;
  ctx.fillRect(0, bandY, w, Math.max(3, h * 0.006));
  ctx.restore();

  // Big display lettering, fitted to the width, gradient + outline + shadow.
  let size = h * 0.155 * (state.captionSize || 1);
  const setFont = (s) => { ctx.font = `${s}px Anton, "Arial Black", sans-serif`; };
  setFont(size);
  while (ctx.measureText(text).width > w * 0.92 && size > 16) {
    size -= 2;
    setFont(size);
  }
  const cy = bandY + bandH * 0.52;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  const grad = ctx.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
  grad.addColorStop(0, grade.caption[0]);
  grad.addColorStop(0.55, grade.caption[1]);
  grad.addColorStop(1, grade.caption[2]);
  ctx.fillStyle = grad;
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = 'rgba(20, 4, 30, 0.9)';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, w / 2, cy);
  ctx.fillText(text, w / 2, cy);
  ctx.restore();

  // Tagline in tracked-out small caps under the title.
  if (tagline) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ts = Math.max(12, h * 0.028);
    ctx.font = `bold ${ts}px "Arial Narrow", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    const ty = bandY + bandH * 0.86;
    // Manual letter-spacing for the tagline.
    const letters = tagline.split('');
    const widths = letters.map((ch) => ctx.measureText(ch).width);
    const gap = ts * 0.35;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
    let lx = w / 2 - total / 2;
    letters.forEach((ch, i) => {
      ctx.fillText(ch, lx + widths[i] / 2, ty);
      lx += widths[i] + gap;
    });
    ctx.restore();
  }

  // Starburst badge as a sticker in a free corner — top-right over the sky
  // when the caption sits at the bottom, bottom-right when it sits on top —
  // so it never covers the lettering.
  if (badge) {
    const bx = w * 0.93;
    const by = state.captionPos === 'top' ? h * 0.90 : h * 0.075;
    const br = Math.min(w, h) * 0.062;
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = '#ffe14d';
    ctx.strokeStyle = '#14101e';
    ctx.lineWidth = Math.max(2, br * 0.06);
    ctx.beginPath();
    const spikes = 12;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? br : br * 0.72;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#14101e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bs = Math.max(9, br * 0.24);
    ctx.font = `bold ${bs}px "Arial Narrow", sans-serif`;
    const words = badge.split(' ');
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(' '), 0, -bs * 0.55);
    ctx.fillText(words.slice(mid).join(' '), 0, bs * 0.55);
    ctx.restore();
  }
}

/** Draws the full cover for `state` onto `canvas` using `photos` (images). */
export function renderCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const intensity = state.intensity ?? 0.85;

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.72);
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, h * 0.70, w, h * 0.30);

  drawSun(ctx, w, h, grade, intensity);
  drawSkyline(ctx, w, h, grade);

  // Panels.
  const layout = LAYOUTS[state.layout] || LAYOUTS.five;
  layout.panels.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, panX: 0, panY: 0, flip: false };
    const photo = photos && photos.length ? photos[panel.photo % photos.length] : null;
    drawPhotoPanel(
      ctx, rect[0] * w, rect[1] * h, rect[2] * w, rect[3] * h,
      photo, panel, grade, intensity,
    );
  });

  // Palms framing the poster, drawn over the panel corners.
  const ps = Math.min(w, h) / 720;
  drawPalm(ctx, w * 0.015, h * 0.72, ps * 1.15, 0.12);
  drawPalm(ctx, w * 0.985, h * 0.72, ps * 1.05, -0.18);

  if (state.grain) {
    drawHalftone(ctx, w, h, grade, intensity);
    drawGrain(ctx, w, h);
  }

  // Vignette.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawCaption(ctx, w, h, state, grade);

  // Thin outer frame.
  ctx.save();
  ctx.lineWidth = Math.max(4, w * 0.008);
  ctx.strokeStyle = '#f5f0ff';
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.restore();
}
