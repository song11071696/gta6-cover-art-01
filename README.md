# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/song11071696/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/song11071696/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your own photos into GTA 6-style multi-panel poster cover art — a Vice City sunset or neon grade, bold gradient lettering, palm silhouettes and a retro sun — and export the cover as a PNG to share. Everything runs offline in your browser: photos are read on your machine and never uploaded.

## Run it

```bash
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests: every script, font and sample photo is a file under `app/`.

## How it works

1. **Add photos** — pick up to 4 from your machine, drag-and-drop them in, or hit **Try a sample cover** to start instantly with the two built-in sample photos.
2. **Pick a layout** — Key Art (large hero + side panels), Five Panel (big centre + 4 surrounding), Split Duo, or Single Hero.
3. **Edit each panel** — click a panel in the live preview to select it, assign any loaded photo, zoom with the slider, drag inside the panel to pan, or flip it.
4. **Grade it** — Vice Sunset, Neon Night, Pastel Day or Ember Dusk, with an intensity slider and a halftone + grain toggle.
5. **Write the caption** — big bold gradient lettering (bundled Anton font, SIL OFL) with outline and drop shadow, editable size and top/bottom position, plus an editable tagline and a starburst badge line.
6. **Export** — PNG at 1080×1080, 1080×1350 or 1920×1080, one button per size or **Export all sizes**. One renderer (`renderCover` in `app/src/cover.js`) draws both the live preview and every export, so the PNG matches the preview exactly.

The decorations are all drawn procedurally on canvas — sun with retro slats, skyline with lit windows, palm-tree silhouettes, halftone dots, vignette — original art, no Rockstar logo, artwork, character or font anywhere.

## Files

- `app/index.html` — the page: top bar with export buttons, controls on the left, live preview canvas in the centre.
- `app/style.css` — neon dusk editor theme.
- `app/src/cover.js` — the render engine: grades, layouts, sun/skyline/palms/halftone, caption lettering, `renderCover`.
- `app/src/main.js` — UI wiring: photo loading, panel editing, exports, shot modes.
- `app/src/shots.js` — fixed screenshot scenes (`?shot=cover`, `?shot=editor`).
- `app/fonts/Anton-Regular.ttf` — display font, SIL Open Font License (see `app/fonts/OFL.txt`).
- `app/samples/` — two AI-made sample photos, free to use.
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- `screenshots/` — 4 screenshots: the exported wide cover, the editor with a photo loaded, and the exported square and portrait covers.

## Prize

This entry is for the make.fun gta6-cover-art-01 bounty, a $250 prize pool split $50 / $30 / $15 for the top three, $5 for places 4–10, and $3 for places 11–50.
