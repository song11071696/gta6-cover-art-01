// Fixed scenes for screenshots.
// ?shot=cover renders one exported-style cover full-screen (photo + caption +
// layout + grade from the query); ?shot=editor shows the editor with a sample
// photo loaded. window.__shotReady is set once the scene has painted, and
// window.__shotCover returns the exported PNG bytes the app itself wrote.
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout') ?? 'five';
  const grade = query.get('grade') ?? 'sunset';

  await api.loadSamples();
  api.setLayout(layout);
  api.setGrade(grade);
  api.setCaption(caption);
  // The requested sample photo leads: panels alternate from it, so a
  // two-panel layout shows both samples instead of the same photo twice.
  const list = api.photos();
  const lead = list.findIndex((img) => img.src.includes(photo));
  if (lead >= 0 && window.__setPanelPhoto && window.__getState) {
    const count = window.__getState().panels.length;
    for (let i = 0; i < count; i++) {
      window.__setPanelPhoto(i, (lead + i) % list.length);
    }
  }
  api.redraw();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    // In cover mode the canvas itself is the screenshot: size it to the
    // requested export size so the shot is the exported cover, full-bleed.
    const w = Number(query.get('w') ?? 1920);
    const h = Number(query.get('h') ?? 1080);
    const canvas = document.getElementById('cover');
    canvas.width = w;
    canvas.height = h;
    api.redraw();
  }

  // Expose the app's own exported PNG for the screenshot driver.
  window.__shotCover = async (w, h) => window.__exportCover(w, h);

  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
