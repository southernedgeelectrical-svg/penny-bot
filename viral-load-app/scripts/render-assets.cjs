// Renders app icons, splash image, Play feature graphic and phone screenshots from the real game.
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const gameUrl = 'file://' + path.join(root, 'game/viral-load.html');

const HIDE_UI = `.stats,.lab,.hud,.strain,.hint,.alert,#mutagenBtn,.toast,.modal{display:none!important}
 .app{grid-template-rows:1fr!important;grid-template-columns:1fr!important}
 .dishwrap{grid-row:1!important;grid-column:1!important}`;

function save(o) {
  return Object.assign({ v: 0, run: 0, life: 0, owned: {}, traits: {}, mut: 0, mutRun: 0, taps: 99, spec: 0,
    code: 'VX-42c', last: Date.now(), nextMut: 1e30, goals: [], sound: false }, o);
}
async function page(b, { w, h, dpr = 1, st, icon, transparent, scale, cxp, cyp, css }) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await p.addInitScript(([st, icon, transparent, scale, cxp, cyp]) => {
    localStorage.setItem('viral-load-v1', JSON.stringify(st));
    window.__noAdapt = 1;
    if (icon) { window.__iconMode = 1; window.__iconScale = scale || 1; window.__iconCx = cxp; window.__iconCy = cyp; }
    if (transparent) window.__iconTransparent = 1;
  }, [st, icon, transparent, scale, cxp, cyp]);
  await p.goto(gameUrl);
  if (css) await p.addStyleTag({ content: css });
  if (transparent) await p.addStyleTag({ content: `html,body,.app,.dishwrap{background:transparent!important}:root{background:transparent!important}` });
  await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(2600);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const corona = save({ spec: 2, mutRun: 24, traits: { aero: 6, recep: 3 } });
  // full-bleed icon (Play listing 512 + legacy icon 1024)
  let p = await page(b, { w: 512, h: 512, dpr: 2, st: corona, icon: 1, scale: 1.25, css: HIDE_UI });
  await p.screenshot({ path: path.join(root, 'assets/icon.png') }); await p.close();
  p = await page(b, { w: 512, h: 512, dpr: 1, st: corona, icon: 1, scale: 1.25, css: HIDE_UI });
  await p.screenshot({ path: path.join(root, 'store/icon-512.png') }); await p.close();
  // adaptive foreground + splash (transparent, inside the 66% safe zone)
  p = await page(b, { w: 512, h: 512, dpr: 2, st: corona, icon: 1, transparent: 1, scale: 0.95, css: HIDE_UI });
  await p.screenshot({ path: path.join(root, 'assets/android-icon-foreground.png'), omitBackground: true });
  await p.screenshot({ path: path.join(root, 'assets/splash-icon.png'), omitBackground: true }); await p.close();
  // feature graphic 1024x500
  p = await page(b, { w: 1024, h: 500, dpr: 1, st: corona, icon: 1, scale: 1.25, cxp: 0.72, cyp: 0.5,
    css: HIDE_UI + `.fg{position:fixed;left:64px;top:50%;transform:translateY(-50%);z-index:5;display:flex;flex-direction:column;gap:10px}
      .fg h1{margin:0;font-family:var(--f-display);font-weight:800;font-size:92px;letter-spacing:-.04em;line-height:.9;color:var(--fg)}
      .fg p{margin:0;font-family:var(--f-mono);font-size:20px;color:var(--gfp)}` });
  await p.evaluate(() => { const d = document.createElement('div'); d.className = 'fg'; d.innerHTML = '<h1>Viral<br>Load</h1><p>tap · mutate · evolve</p>'; document.body.appendChild(d); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(root, 'store/feature-graphic-1024x500.png') }); await p.close();
  // phone screenshots 1080x1920
  const shots = [
    ['1-replicate', save({ v: 48200, run: 9e4, life: 9e4, owned: { ribo: 31, poly: 14, capsid: 6, lytic: 1 }, spec: 2, mutRun: 30, traits: { aero: 4 }, mut: 7 }), null],
    ['2-evolve', save({ v: 3.1e6, run: 5e6, life: 5e6, owned: { ribo: 60, poly: 40, capsid: 30, lytic: 18, tissue: 7 }, spec: 0, mutRun: 45, traits: { aero: 5, recep: 4, cyto: 2 }, mut: 23 }), 'evo'],
    ['3-speciate', save({ v: 2.4e7, run: 6.3e7, life: 2e9, owned: { ribo: 80, poly: 60, capsid: 50, lytic: 30, tissue: 20, organ: 9 }, spec: 3, genome: 12, mutRun: 60, mut: 4 }), 'spe'],
    ['4-goals', save({ v: 8.8e5, run: 1e6, life: 4e8, owned: { ribo: 40, poly: 25, capsid: 25 }, spec: 4, genome: 20, mutRun: 52, mut: 11, kills: 4, events: 3, maxCombo: 3, goals: ['tap50','ribo10','vps10','mut10','combo3','kill1','gold1','vps1k','cap25','mut50','spec1'] }), 'log'],
  ];
  for (const [name, st, tab] of shots) {
    p = await page(b, { w: 360, h: 640, dpr: 3, st });
    if (tab) await p.click('#tab-' + tab);
    const box = await (await p.$('#dish')).boundingBox();
    for (let i = 0; i < 6; i++) { await p.mouse.click(box.x + box.width / 2, box.y + box.height * 0.58); await p.waitForTimeout(110); }
    await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(root, `store/screenshot-${name}.png`) }); await p.close();
  }
  await b.close();
})();
