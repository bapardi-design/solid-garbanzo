import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const OUT = '/home/user/solid-garbanzo/manager-app/public/img';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 100, height: 100 } });

const draw = async (name, w, h, fn, quality = 0.82) => {
  const dataUrl = await page.evaluate(async ({ w, h, src }) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // deterministic rng so re-runs give the same art
    let s = 1337;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const fn = new Function('ctx', 'w', 'h', 'rnd', src);
    fn(ctx, w, h, rnd);
    return c.toDataURL('image/jpeg', 0.82);
  }, { w, h, src: fn });
  const b64 = dataUrl.split(',')[1];
  writeFileSync(`${OUT}/${name}`, Buffer.from(b64, 'base64'));
  console.log(name, Math.round(Buffer.from(b64, 'base64').length / 1024) + 'kB');
  void quality;
};

/* ---------- 1. night stadium ---------- */
await draw('stadium-night.jpg', 1920, 1080, `
  // sky and bowl
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#05090b'); sky.addColorStop(0.55, '#0a1512'); sky.addColorStop(1, '#0c1a15');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  // floodlight glows
  const lights = [[w*0.13,h*0.10],[w*0.87,h*0.10],[w*0.36,h*0.05],[w*0.64,h*0.05]];
  for (const [lx, ly] of lights) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.30);
    g.addColorStop(0, 'rgba(226,240,230,.55)');
    g.addColorStop(0.18, 'rgba(180,215,195,.16)');
    g.addColorStop(1, 'rgba(120,170,150,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(240,250,244,.9)';
    ctx.beginPath(); ctx.ellipse(lx, ly, 26, 9, 0, 0, 7); ctx.fill();
  }

  // pitch trapezoid (perspective)
  const top = h * 0.52, bot = h * 0.99;
  const tl = w * 0.20, tr = w * 0.80, bl = -w * 0.08, br = w * 1.08;
  const lerp = (a, b, t) => a + (b - a) * t;
  const edge = (t) => [lerp(tl, bl, t), lerp(tr, br, t), lerp(top, bot, t)];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tl, top); ctx.lineTo(tr, top); ctx.lineTo(br, bot); ctx.lineTo(bl, bot); ctx.closePath();
  ctx.clip();
  const grass = ctx.createLinearGradient(0, top, 0, bot);
  grass.addColorStop(0, '#1f5c39'); grass.addColorStop(0.5, '#27713f'); grass.addColorStop(1, '#1b5433');
  ctx.fillStyle = grass; ctx.fillRect(0, top, w, bot - top);
  // mown stripes, converging
  for (let i = 0; i < 14; i++) {
    if (i % 2) continue;
    const t0 = i / 14, t1 = (i + 1) / 14;
    const x0t = lerp(tl, tr, t0), x1t = lerp(tl, tr, t1);
    const x0b = lerp(bl, br, t0), x1b = lerp(bl, br, t1);
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    ctx.beginPath(); ctx.moveTo(x0t, top); ctx.lineTo(x1t, top); ctx.lineTo(x1b, bot); ctx.lineTo(x0b, bot); ctx.closePath(); ctx.fill();
  }
  // markings
  ctx.strokeStyle = 'rgba(235,245,238,.42)'; ctx.lineWidth = 3;
  const [hl, hr, hy] = edge(0.42);
  ctx.beginPath(); ctx.moveTo(hl, hy); ctx.lineTo(hr, hy); ctx.stroke();
  ctx.beginPath(); ctx.ellipse((hl + hr) / 2, hy, (hr - hl) * 0.13, (bot - top) * 0.075, 0, 0, 7); ctx.stroke();
  const [bl2, br2, by] = edge(0.06);
  ctx.beginPath(); ctx.moveTo(lerp(bl2, br2, 0.28), by); ctx.lineTo(lerp(bl2, br2, 0.72), by);
  ctx.lineTo(lerp(tl, tr, 0.70), top + 2); ctx.lineTo(lerp(tl, tr, 0.30), top + 2); ctx.stroke();
  ctx.restore();

  // stands: dark silhouettes with crowd speckle
  const stand = (x0, y0, x1, y1, x2, y2, x3, y3, density) => {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
    ctx.clip();
    const g = ctx.createLinearGradient(0, Math.min(y0, y1), 0, Math.max(y2, y3));
    g.addColorStop(0, '#0a0f0d'); g.addColorStop(1, '#141c18');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const minX = Math.min(x0, x1, x2, x3), maxX = Math.max(x0, x1, x2, x3);
    const minY = Math.min(y0, y1, y2, y3), maxY = Math.max(y0, y1, y2, y3);
    for (let i = 0; i < density; i++) {
      const px = minX + rnd() * (maxX - minX), py = minY + rnd() * (maxY - minY);
      const warm = rnd();
      const col = warm > 0.93 ? 'rgba(255,226,170,' : warm > 0.75 ? 'rgba(200,215,225,' : 'rgba(150,165,175,';
      ctx.fillStyle = col + (0.10 + rnd() * 0.4) + ')';
      const r = 1 + rnd() * 2.2;
      ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.8, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  };
  stand(0, h * 0.30, w * 0.20, h * 0.52, w * 0.20, h * 0.52, 0, h * 1.0, 9000);
  stand(w * 0.80, h * 0.52, w, h * 0.30, w, h * 1.0, w * 0.80, h * 0.52, 9000);
  stand(w * 0.20, h * 0.30, w * 0.80, h * 0.30, w * 0.80, h * 0.52, w * 0.20, h * 0.52, 14000);

  // roof lip
  ctx.fillStyle = '#070b09';
  ctx.beginPath(); ctx.moveTo(0, h * 0.30); ctx.lineTo(w, h * 0.30); ctx.lineTo(w, h * 0.24); ctx.lineTo(0, h * 0.24); ctx.closePath(); ctx.fill();

  // atmosphere haze over the pitch
  const haze = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, w * 0.6);
  haze.addColorStop(0, 'rgba(200,230,214,.10)'); haze.addColorStop(1, 'rgba(200,230,214,0)');
  ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);

  // vignette + grain
  const vig = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.25, w / 2, h * 0.5, w * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 60000; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (rnd() * 0.022) + ')';
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
`);

/* ---------- 2. turf ---------- */
await draw('turf.jpg', 1600, 900, `
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2b7a46'); g.addColorStop(1, '#1e5e35');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const stripe = w / 9;
  for (let i = 0; i < 9; i++) {
    if (i % 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,.055)';
    ctx.fillRect(i * stripe, 0, stripe, h);
  }
  // blades
  for (let i = 0; i < 90000; i++) {
    const x = rnd() * w, y = rnd() * h;
    ctx.strokeStyle = 'rgba(' + (rnd() > 0.5 ? '255,255,255,' : '0,0,0,') + (rnd() * 0.05) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 2, y - rnd() * 4); ctx.stroke();
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
`);

/* ---------- 3. crowd bokeh strip ---------- */
await draw('crowd.jpg', 1600, 420, `
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a100e'); g.addColorStop(1, '#16201b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // far crowd: small, dim
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * w, y = rnd() * h * 0.6;
    const warm = rnd();
    const col = warm > 0.95 ? 'rgba(255,220,160,' : warm > 0.7 ? 'rgba(190,210,220,' : 'rgba(130,150,160,';
    ctx.fillStyle = col + (0.05 + rnd() * 0.3) + ')';
    const r = 1 + rnd() * 2;
    ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, 7); ctx.fill();
  }
  // near crowd: bigger bokeh discs
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = h * 0.45 + rnd() * h * 0.6;
    const r = 4 + rnd() * 16;
    const warm = rnd();
    const col = warm > 0.9 ? 'rgba(255,214,150,' : warm > 0.55 ? 'rgba(120,200,165,' : 'rgba(160,180,195,';
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col + (0.30 + rnd() * 0.25) + ')');
    rg.addColorStop(1, col + '0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, 7); ctx.fill();
  }
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(8,12,10,.35)'); fade.addColorStop(1, 'rgba(8,12,10,.85)');
  ctx.fillStyle = fade; ctx.fillRect(0, 0, w, h);
`);

await browser.close();
