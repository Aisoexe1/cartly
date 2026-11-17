// Власні фонові ефекти для hero-lab.html (Canvas 2D). Мотиви взяті з популярних фонів
// (flow field, particle ribbon, wave field, mesh aurora, vortex, prismatic burst і т.д.),
// але переосмислені під Cartly: посилки, маршрути, чеки, цінники.
// Кожен ефект: (palette) => { draw(ctx, w, h, t, mouse) }, palette = { bg, ink, accent, surface }.

// ---------- утиліти ----------
const P = new Uint8Array(512);
{ const p = [...Array(256).keys()]; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
function grad(h, x, y) { const g = h & 7; const u = g < 4 ? x : y, v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); }
export function noise(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y), A = P[X] + Y, B = P[X + 1] + Y;
  return lerp(lerp(grad(P[A], x, y), grad(P[B], x - 1, y), u), lerp(grad(P[A + 1], x, y - 1), grad(P[B + 1], x - 1, y - 1), u), v) * 0.25;
}
const fbm = (x, y) => noise(x, y) + 0.5 * noise(x * 2.03, y * 2.03) + 0.25 * noise(x * 4.1, y * 4.1);
export function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mix(h1, h2, t) { const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
  return `rgb(${r},${g},${bl})`; }
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function clear(c, w, h, col, a = 1) { c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ---------- 10 за референсами ----------
export const FX = {
  // KokonutUI / 21st.dev flow field: частинки в полі шуму зі світними слідами; у Cartly вони тягнуться вправо, як потік замовлень
  flow(p) { const R = rnd(3); let pts = null;
    return { trail: true, draw(c, w, h, t, m) {
      if (!pts) { pts = Array.from({ length: 900 }, () => ({ x: R() * w, y: R() * h, l: R() * 200 })); clear(c, w, h, p.bg); }
      clear(c, w, h, p.bg, 0.07); c.fillStyle = rgba(p.accent, 0.55);
      for (const q of pts) { const a = fbm(q.x * 0.0022, q.y * 0.0022 + t * 0.05) * 6.3; q.x += Math.cos(a) * 1.4 + 0.6; q.y += Math.sin(a) * 1.4;
        if (m) { const dx = q.x - m.x, dy = q.y - m.y, d = dx * dx + dy * dy; if (d < 9000) { q.x += dx * 0.03; q.y += dy * 0.03; } }
        if (q.x > w || q.y < 0 || q.y > h || --q.l < 0) { q.x = R() * w * 0.3; q.y = R() * h; q.l = 120 + R() * 200; }
        c.fillRect(q.x, q.y, 1.3, 1.3); } } }; },

  // Framer particle ribbon (double helix): дві стрічки точок, що закручуються навколо вікна замовлень
  helix(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg);
    for (let s = 0; s < 2; s++) for (let i = 0; i < 260; i++) { const k = i / 260, x = k * w * 1.1 - w * 0.05;
      const ph = k * 12 + t * 0.9 + s * Math.PI, y = h * 0.55 + Math.sin(k * 3.2 + t * 0.3) * h * 0.18 + Math.cos(ph) * h * 0.12, z = (Math.sin(ph) + 1) / 2;
      c.fillStyle = rgba(s ? p.accent : p.ink, 0.12 + z * 0.55); c.beginPath(); c.arc(x, y, 1 + z * 3.2, 0, 7); c.fill(); } } }; },

  // інтерактивна мережа частинок: вузли як міста, лінії як рейси Нової Пошти, курсор притягує мережу
  network(p) { const R = rnd(9); let n = null;
    return { draw(c, w, h, t, m) { clear(c, w, h, p.bg);
      if (!n) n = Array.from({ length: 70 }, () => ({ x: R() * w, y: R() * h, vx: (R() - .5) * .4, vy: (R() - .5) * .4 }));
      for (const a of n) { a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > w) a.vx *= -1; if (a.y < 0 || a.y > h) a.vy *= -1;
        if (m) { a.x += (m.x - a.x) * 0.002; a.y += (m.y - a.y) * 0.002; } }
      for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) { const d = Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y);
        if (d < 150) { c.strokeStyle = rgba(p.accent, (1 - d / 150) * 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(n[i].x, n[i].y); c.lineTo(n[j].x, n[j].y); c.stroke(); } }
      for (const [i, a] of n.entries()) { const pulse = (Math.sin(t * 2 + i) + 1) / 2; c.fillStyle = rgba(p.accent, 0.6 + pulse * 0.4); c.beginPath(); c.arc(a.x, a.y, 2 + pulse * 1.5, 0, 7); c.fill(); } } }; },

  // Framer wave field: сітка точок у перспективі, хвилі біжать від правого краю
  wavefield(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg);
    const cols = 70, rows = 34;
    for (let r = 0; r < rows; r++) { const z = r / rows, py = h * 0.42 + Math.pow(z, 1.6) * h * 0.62, sc = 0.25 + z * 1.4;
      for (let k = 0; k < cols; k++) { const u = k / (cols - 1) - 0.5, px = w * 0.55 + u * w * 1.6 * sc;
        const e = Math.sin(u * 9 - t * 1.6 + z * 4) * Math.cos(z * 6 + t * 0.8) * 22 * sc;
        c.fillStyle = rgba(p.accent, 0.15 + z * 0.6); c.fillRect(px, py + e, 1.4 * sc + 0.6, 1.4 * sc + 0.6); } } } }; },

  // 21st.dev glyph flow field: замість абстрактних знаків летять ₴, %, №, цифри ТТН
  glyphs(p) { const R = rnd(5), G = '₴%№0123456789ТТН+'; let g = null;
    return { draw(c, w, h, t) { clear(c, w, h, p.bg, 0.22);
      if (!g) { clear(c, w, h, p.bg); g = Array.from({ length: 260 }, () => ({ x: R() * w, y: R() * h, ch: G[Math.floor(R() * G.length)], s: 10 + R() * 14 })); }
      c.textAlign = 'center';
      for (const q of g) { const a = noise(q.x * 0.003, q.y * 0.003 + t * 0.08) * 6.3; q.x += Math.cos(a) * 0.9 + 0.35; q.y += Math.sin(a) * 0.9;
        if (q.x > w + 20) { q.x = -20; q.y = R() * h; } if (q.y < -20) q.y = h + 20; if (q.y > h + 20) q.y = -20;
        c.font = `500 ${q.s}px ui-monospace, monospace`; c.fillStyle = rgba(p.accent, 0.25 + (q.s - 10) / 30); c.fillText(q.ch, q.x, q.y); } } }; },

  // Aurora mesh gradient (Framer): кольорові плями, але з чіткими «дзеркальними» відблисками й зерном
  mesh(p) { const grain = document.createElement('canvas'); grain.width = grain.height = 128;
    { const x = grain.getContext('2d'), im = x.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 18; } x.putImageData(im, 0, 0); }
    return { draw(c, w, h, t) { clear(c, w, h, p.bg);
      const blobs = [[.72, .3, p.accent, .55], [.9, .75, p.surface, .9], [.55, .85, p.accent, .35], [.35, .15, p.surface, .7]];
      blobs.forEach(([x, y, col, a], i) => { const px = w * (x + .08 * Math.sin(t * .35 + i * 1.7)), py = h * (y + .1 * Math.cos(t * .28 + i)), r = Math.max(w, h) * .45;
        const g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, w, h); } }; },

  // Luminous floating wave lines: десятки тонких ліній, що світяться й дихають
  lines(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 38; i++) { const k = i / 38; c.beginPath();
      for (let x = 0; x <= w; x += 8) { const u = x / w, y = h * (0.35 + k * 0.5) + Math.sin(u * 5 + t * 0.6 + k * 4) * 40 * (0.4 + u) + noise(u * 2 + t * 0.1, k * 3) * 60; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = rgba(p.accent, 0.05 + 0.18 * Math.sin(k * Math.PI)); c.lineWidth = 1.2; c.stroke(); }
    c.globalCompositeOperation = 'source-over'; } }; },

  // Particle vortex: спіраль частинок навколо точки за вікном, як воронка замовлень
  vortex(p) { const R = rnd(11); const pts = Array.from({ length: 1400 }, () => ({ r: Math.pow(R(), .6), a: R() * 7, s: .3 + R() }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg, 0.25); const cx = w * .72, cy = h * .5, M = Math.max(w, h) * .55;
      for (const q of pts) { q.a += 0.004 / (q.r + .08) * q.s; q.r -= 0.0007 * q.s; if (q.r < 0.02) q.r = 1;
        const x = cx + Math.cos(q.a) * q.r * M, y = cy + Math.sin(q.a) * q.r * M * .55;
        c.fillStyle = rgba(p.accent, .25 + (1 - q.r) * .7); c.fillRect(x, y, 1.6, 1.6); } } }; },

  // Bokeh dust drift: мʼякі кола боке, що повільно пливуть угору
  bokeh(p) { const R = rnd(21); const b = Array.from({ length: 34 }, () => ({ x: R(), y: R(), r: 20 + R() * 90, s: .2 + R() * .6, a: .05 + R() * .18 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg);
      for (const q of b) { const y = ((q.y - t * q.s * 0.02) % 1 + 1) % 1, x = q.x + Math.sin(t * .2 + q.r) * .02;
        const g = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, q.r); g.addColorStop(0, rgba(p.accent, q.a)); g.addColorStop(.7, rgba(p.accent, q.a * .6)); g.addColorStop(1, rgba(p.accent, 0));
        c.fillStyle = g; c.beginPath(); c.arc(x * w, y * h, q.r, 0, 7); c.fill(); } } }; },

  // Prismatic burst: промені з точки за вікном, що повільно обертаються
  burst(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const cx = w * .7, cy = h * .45, L = Math.hypot(w, h);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2 + t * .05, wd = .02 + .02 * Math.sin(i * 3.1 + t);
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, L * .7); g.addColorStop(0, rgba(i % 3 ? p.accent : p.ink, .35)); g.addColorStop(1, rgba(p.accent, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, L, a, a + wd); c.closePath(); c.fill(); }
    c.globalCompositeOperation = 'source-over'; } }; },

  // ---------- 10 своїх на тему Cartly ----------
  // маршрути: точкова карта, по дугах летять посилки між містами
  routes(p) { const R = rnd(4); const cities = Array.from({ length: 16 }, () => ({ x: .3 + R() * .68, y: .15 + R() * .7 })); let arcs = [];
    return { draw(c, w, h, t) { clear(c, w, h, p.bg);
      for (let x = 0; x < w; x += 14) for (let y = 0; y < h; y += 14) { const v = fbm(x * .004, y * .004); if (v > .05 && x > w * .25) { c.fillStyle = rgba(p.ink, .12); c.fillRect(x, y, 2, 2); } }
      if (arcs.length < 9 && R() < .08) { const a = cities[Math.floor(R() * 16)], b = cities[Math.floor(R() * 16)]; if (a !== b) arcs.push({ a, b, k: 0 }); }
      arcs = arcs.filter(q => (q.k += .006) < 1.3);
      for (const q of arcs) { const ax = q.a.x * w, ay = q.a.y * h, bx = q.b.x * w, by = q.b.y * h, mx = (ax + bx) / 2, my = Math.min(ay, by) - 80;
        c.strokeStyle = rgba(p.accent, .35 * Math.min(1, 1.3 - q.k)); c.lineWidth = 1.3; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke();
        const k = Math.min(1, q.k), x = (1 - k) ** 2 * ax + 2 * (1 - k) * k * mx + k * k * bx, y = (1 - k) ** 2 * ay + 2 * (1 - k) * k * my + k * k * by;
        c.fillStyle = p.accent; c.fillRect(x - 3, y - 3, 6, 6); }
      for (const q of cities) { c.fillStyle = rgba(p.accent, .9); c.beginPath(); c.arc(q.x * w, q.y * h, 3, 0, 7); c.fill(); c.strokeStyle = rgba(p.accent, .3); c.beginPath(); c.arc(q.x * w, q.y * h, 6 + (t * 6 + q.x * 20) % 12, 0, 7); c.stroke(); } } }; },

  // конвеєр: ізометричні коробки їдуть стрічкою по діагоналі
  conveyor(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg);
    const box = (x, y, s) => { c.fillStyle = mix(p.bg, p.accent, .9); c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y + s * .5); c.lineTo(x, y + s); c.lineTo(x - s, y + s * .5); c.closePath(); c.fill();
      c.fillStyle = mix(p.bg, p.accent, .65); c.beginPath(); c.moveTo(x - s, y + s * .5); c.lineTo(x, y + s); c.lineTo(x, y + s * 2); c.lineTo(x - s, y + s * 1.5); c.closePath(); c.fill();
      c.fillStyle = mix(p.bg, p.accent, .45); c.beginPath(); c.moveTo(x + s, y + s * .5); c.lineTo(x, y + s); c.lineTo(x, y + s * 2); c.lineTo(x + s, y + s * 1.5); c.closePath(); c.fill();
      c.strokeStyle = rgba(p.bg, .6); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - s * .5, y + s * .25); c.lineTo(x + s * .5, y + s * .75); c.stroke(); };
    for (let lane = 0; lane < 3; lane++) { const gap = 150, off = (t * 40 + lane * 70) % gap;
      for (let i = -2; i < 14; i++) { const d = i * gap + off, x = w * .35 + d * .87 - lane * 120, y = h * .1 + d * .5 + lane * 190; if (x > w + 80 || y > h + 80) continue; box(x, y, 26 + lane * 6); } } } }; },

  // стрічка чеків: колонки цифр з касових чеків повільно прокручуються (замість «матриці»)
  receipts(p) { const R = rnd(8); const cols = Array.from({ length: 30 }, () => ({ sp: 10 + R() * 30, rows: Array.from({ length: 40 }, () => (R() < .2 ? 'РАЗОМ ' : '') + (R() * 3000).toFixed(2) + ' ₴') }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.font = '500 12px ui-monospace, monospace'; const cw = w / cols.length;
      cols.forEach((col, i) => { const x = i * cw; if (x < w * .3) return; const off = (t * col.sp) % 20;
        col.rows.forEach((r, j) => { const y = j * 20 + off - 20; const hi = (j + Math.floor(t * col.sp / 20)) % 13 === 0;
          c.fillStyle = hi ? p.accent : rgba(p.ink, .16); c.fillText(r, x, y); }); }); } }; },

  // lava lamp / metaballs: склеєні «краплі» у правій половині
  metaballs(p) { const S = 8; let off = null;
    return { fps: 30, draw(c, w, h, t) { const W = Math.ceil(w / S), H = Math.ceil(h / S);
      if (!off || off.width !== W) { off = document.createElement('canvas'); off.width = W; off.height = H; }
      const x = off.getContext('2d'), im = x.createImageData(W, H), A = parseInt(p.accent.slice(1), 16), B = parseInt(p.bg.slice(1), 16);
      const balls = Array.from({ length: 7 }, (_, i) => [W * (.62 + .25 * Math.sin(t * .3 + i * 1.3)), H * (.5 + .38 * Math.cos(t * .23 + i * 2.1)), H * (.11 + .04 * (i % 3))]);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = 0; for (const [bx, by, r] of balls) v += r * r / ((i - bx) ** 2 + (j - by) ** 2 + 1);
        const k = v > 1 ? 1 : v > .7 ? (v - .7) / .3 : 0, o = (j * W + i) * 4;
        im.data[o] = lerp(B >> 16, A >> 16, k); im.data[o + 1] = lerp((B >> 8) & 255, (A >> 8) & 255, k); im.data[o + 2] = lerp(B & 255, A & 255, k); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(off, 0, 0, w, h); } }; },

  // hyperspace: зірки летять із точки за вікном
  warp(p) { const R = rnd(13); const s = Array.from({ length: 700 }, () => ({ a: R() * 7, d: R(), v: .3 + R() }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg, .35); const cx = w * .68, cy = h * .48, M = Math.hypot(w, h);
      for (const q of s) { const d0 = q.d * q.d * M; q.d += .004 * q.v; if (q.d > 1) q.d = .02; const d1 = q.d * q.d * M;
        c.strokeStyle = rgba(p.accent, Math.min(1, q.d * 1.5)); c.lineWidth = q.d * 2;
        c.beginPath(); c.moveTo(cx + Math.cos(q.a) * d0, cy + Math.sin(q.a) * d0); c.lineTo(cx + Math.cos(q.a) * d1, cy + Math.sin(q.a) * d1); c.stroke(); } } }; },

  // муар: дві системи концентричних кіл, що зсуваються одна відносно одної
  moire(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.strokeStyle = rgba(p.accent, .5); c.lineWidth = 1.4;
    const ring = (x, y) => { for (let r = 6; r < Math.max(w, h); r += 9) { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } };
    ring(w * .7 + Math.sin(t * .3) * 60, h * .5); ring(w * .78 + Math.cos(t * .25) * 50, h * .45 + Math.sin(t * .2) * 40); } }; },

  // вітраж Вороного: клітини дрейфують, кожна блимає як нове замовлення
  voronoi(p) { const R = rnd(17); const pts = Array.from({ length: 24 }, () => ({ x: R(), y: R(), s: R() * 6 })); const S = 10; let off = null;
    return { fps: 24, draw(c, w, h, t) { const W = Math.ceil(w / S), H = Math.ceil(h / S);
      if (!off || off.width !== W) { off = document.createElement('canvas'); off.width = W; off.height = H; }
      const x = off.getContext('2d'), im = x.createImageData(W, H), A = parseInt(p.accent.slice(1), 16), B = parseInt(p.bg.slice(1), 16);
      const q = pts.map(o => [W * (o.x + .03 * Math.sin(t * .4 + o.s)), H * (o.y + .03 * Math.cos(t * .3 + o.s)), (Math.sin(t * .8 + o.s * 3) + 1) / 2]);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let d1 = 1e9, d2 = 1e9, lit = 0;
        for (const [px, py, l] of q) { const d = (i - px) ** 2 + (j - py) ** 2; if (d < d1) { d2 = d1; d1 = d; lit = l; } else if (d < d2) d2 = d; }
        const edge = Math.sqrt(d2) - Math.sqrt(d1) < 0.9 ? 1 : 0, k = edge ? .85 : lit * .35 * (i / W), o = (j * W + i) * 4;
        im.data[o] = lerp(B >> 16, A >> 16, k); im.data[o + 1] = lerp((B >> 8) & 255, (A >> 8) & 255, k); im.data[o + 2] = lerp(B & 255, A & 255, k); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(off, 0, 0, w, h); } }; },

  // мармурування: доменне спотворення шуму, як фарба на воді
  marble(p) { const S = 8; let off = null;
    return { fps: 30, draw(c, w, h, t) { const W = Math.ceil(w / S), H = Math.ceil(h / S);
      if (!off || off.width !== W) { off = document.createElement('canvas'); off.width = W; off.height = H; }
      const x = off.getContext('2d'), im = x.createImageData(W, H), A = parseInt(p.accent.slice(1), 16), B = parseInt(p.bg.slice(1), 16);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = i / W * 3, v = j / H * 2;
        const qx = fbm(u + t * .05, v), qy = fbm(u + 5.2, v + 1.3 + t * .04); const n = fbm(u + 4 * qx, v + 4 * qy);
        const k = Math.max(0, Math.min(1, (Math.sin(n * 14) * .5 + .5) * (.25 + .75 * i / W))), o = (j * W + i) * 4;
        im.data[o] = lerp(B >> 16, A >> 16, k); im.data[o + 1] = lerp((B >> 8) & 255, (A >> 8) & 255, k); im.data[o + 2] = lerp(B & 255, A & 255, k); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(off, 0, 0, w, h); } }; },

  // шовкова стрічка: одна широка стрічка крутиться в просторі
  ribbon(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const N = 140;
    for (let i = 0; i < N; i++) { const k = i / N, x = w * (.15 + k * .95), tw = k * 6 + t * .7;
      const cy = h * .55 + Math.sin(k * 4 + t * .4) * h * .2, half = Math.cos(tw) * 70, lit = (Math.sin(tw) + 1) / 2;
      c.strokeStyle = mix(p.bg, p.accent, .25 + lit * .75); c.lineWidth = w / N + 1.2; c.beginPath(); c.moveTo(x, cy - half); c.lineTo(x, cy + half); c.stroke(); } } }; },

  // цінники: плавають картки з цінами й кошики, курсор розштовхує їх
  tags(p) { const R = rnd(31); const T = Array.from({ length: 26 }, () => ({ x: .3 + R() * .7, y: R(), r: R() * 6, s: .4 + R() * .8, v: Math.round(99 + R() * 4900), cart: R() < .25 }));
    return { draw(c, w, h, t, m) { clear(c, w, h, p.bg); c.font = '600 13px system-ui, sans-serif'; c.textBaseline = 'middle';
      for (const q of T) { let x = q.x * w + Math.sin(t * .3 + q.r) * 20, y = ((q.y - t * .01 * q.s) % 1 + 1) % 1 * (h + 80) - 40;
        if (m) { const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy); if (d < 140) { x += dx / d * (140 - d) * .5; y += dy / d * (140 - d) * .5; } }
        c.save(); c.translate(x, y); c.rotate(Math.sin(t * .4 + q.r) * .25);
        if (q.cart) { c.strokeStyle = rgba(p.accent, .7); c.lineWidth = 2.2; c.beginPath(); c.moveTo(-14, -10); c.lineTo(-9, -10); c.lineTo(-4, 6); c.lineTo(12, 6); c.lineTo(15, -5); c.lineTo(-7, -5); c.stroke(); c.beginPath(); c.arc(-2, 12, 2, 0, 7); c.arc(10, 12, 2, 0, 7); c.stroke(); }
        else { const label = q.v + ' ₴', tw = c.measureText(label).width + 26; c.fillStyle = rgba(p.accent, .14); rrect(c, -tw / 2, -14, tw, 28, 8); c.fill();
          c.strokeStyle = rgba(p.accent, .5); c.lineWidth = 1; c.stroke(); c.fillStyle = rgba(p.accent, .9); c.beginPath(); c.arc(-tw / 2 + 9, 0, 2.5, 0, 7); c.fill(); c.fillText(label, -tw / 2 + 17, 1); }
        c.restore(); } } }; },
};

// ---------- ще 30 (42-71) ----------
const T2 = Math.PI * 2;
Object.assign(FX, {
  rain(p) { const R = rnd(41); const d = Array.from({ length: 260 }, () => ({ x: R(), y: R(), l: 10 + R() * 40, s: .6 + R() }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.strokeStyle = rgba(p.accent, .35); c.lineWidth = 1;
      for (const q of d) { const y = ((q.y + t * .25 * q.s) % 1) * (h + 60) - 30, x = q.x * w * 1.2 - y * .25; c.beginPath(); c.moveTo(x, y); c.lineTo(x - q.l * .25, y - q.l); c.stroke(); } } }; },
  confetti(p) { const R = rnd(42); const d = Array.from({ length: 120 }, () => ({ x: .3 + R() * .7, y: R(), r: R() * 7, s: .3 + R() * .7, z: 4 + R() * 7 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg);
      for (const q of d) { const y = ((q.y + t * .04 * q.s) % 1) * (h + 40) - 20, x = q.x * w + Math.sin(t + q.r) * 20;
        c.save(); c.translate(x, y); c.rotate(t * q.s * 2 + q.r); c.scale(1, Math.cos(t * 3 * q.s + q.r)); c.fillStyle = rgba(q.r > 3.5 ? p.accent : p.ink, .7); c.fillRect(-q.z / 2, -q.z / 4, q.z, q.z / 2); c.restore(); } } }; },
  stripes(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.save(); c.translate(w * .6, h * .5); c.rotate(-.5);
    for (let i = -40; i < 40; i++) { const x = i * 34 + (t * 20) % 34; c.fillStyle = rgba(p.accent, .08 + .06 * Math.sin(i * .5 + t)); c.fillRect(x, -h * 1.5, 14, h * 3); } c.restore(); } }; },
  sonar(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const cx = w * .7, cy = h * .5;
    for (let i = 0; i < 6; i++) { const k = ((t * .3 + i / 6) % 1); c.strokeStyle = rgba(p.accent, (1 - k) * .6); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, k * Math.max(w, h) * .6, 0, T2); c.stroke(); }
    c.fillStyle = p.accent; c.beginPath(); c.arc(cx, cy, 5, 0, T2); c.fill(); } }; },
  orbit(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const cx = w * .7, cy = h * .5;
    for (let r = 1; r <= 4; r++) { const R0 = r * 85; c.strokeStyle = rgba(p.accent, .15); c.beginPath(); c.ellipse(cx, cy, R0, R0 * .45, 0, 0, T2); c.stroke();
      for (let k = 0; k < r; k++) { const a = t * (.5 / r) + k * T2 / r, x = cx + Math.cos(a) * R0, y = cy + Math.sin(a) * R0 * .45; c.fillStyle = p.accent; rrect(c, x - 9, y - 9, 18, 18, 4); c.fill(); } } } }; },
  fabric(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.strokeStyle = rgba(p.accent, .3); c.lineWidth = 1;
    for (let y = 0; y < h; y += 22) { c.beginPath(); for (let x = 0; x <= w; x += 10) { const yy = y + Math.sin(x * .01 + t + y * .02) * 12 * (x / w); x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
    for (let x = 0; x < w; x += 22) { c.beginPath(); for (let y = 0; y <= h; y += 10) { const xx = x + Math.cos(y * .012 + t * .8 + x * .01) * 12 * (x / w); y ? c.lineTo(xx, y) : c.moveTo(xx, y); } c.stroke(); } } }; },
  popdots(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.fillStyle = p.accent;
    for (let y = 10; y < h; y += 20) for (let x = 10; x < w; x += 20) { const r = Math.max(0, (Math.sin(x * .012 - t * 1.5) + Math.cos(y * .015 + t)) * 3.2 + 2) * (x / w); c.beginPath(); c.arc(x, y, r, 0, T2); c.fill(); } } }; },
  equalizer(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const n = 48, bw = w * .62 / n;
    for (let i = 0; i < n; i++) { const v = (noise(i * .2, t * .8) + .55) * h * .6; c.fillStyle = rgba(p.accent, .2 + i / n * .6); c.fillRect(w * .36 + i * bw, h - v, bw - 3, v); } } }; },
  chart(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const k = (t * .15) % 1.3, n = 60;
    c.strokeStyle = rgba(p.ink, .07); for (let y = h * .2; y < h; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const pt = i => [w * .2 + i / n * w * .8, h * .85 - (i / n) * h * .55 - noise(i * .25, 3) * 90];
    c.beginPath(); const m = Math.min(n, Math.floor(k * n)); for (let i = 0; i <= m; i++) { const [x, y] = pt(i); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.strokeStyle = p.accent; c.lineWidth = 3; c.stroke(); const [x, y] = pt(m); c.lineTo(x, h); c.lineTo(w * .2, h); c.closePath(); c.fillStyle = rgba(p.accent, .1); c.fill();
    c.fillStyle = p.accent; c.beginPath(); c.arc(x, y, 6, 0, T2); c.fill(); } }; },
  stars(p) { const R = rnd(51); const s = Array.from({ length: 220 }, () => ({ x: R(), y: R(), r: R() * 1.6 + .3, f: R() * 6 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg);
      for (const q of s) { c.fillStyle = rgba(p.accent, .25 + .75 * Math.abs(Math.sin(t * .8 + q.f))); c.beginPath(); c.arc(q.x * w, q.y * h, q.r, 0, T2); c.fill(); }
      c.strokeStyle = rgba(p.accent, .25); c.beginPath(); for (let i = 0; i < 12; i++) { const q = s[i * 7]; i ? c.lineTo(q.x * w, q.y * h) : c.moveTo(q.x * w, q.y * h); } c.stroke(); } }; },
  smoke(p) { const S = 8; let off = null;
    return { fps: 30, draw(c, w, h, t) { const W = Math.ceil(w / S), H = Math.ceil(h / S); if (!off || off.width !== W) { off = document.createElement('canvas'); off.width = W; off.height = H; }
      const x = off.getContext('2d'), im = x.createImageData(W, H), A = parseInt(p.accent.slice(1), 16), B = parseInt(p.bg.slice(1), 16);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = Math.max(0, Math.min(1, (fbm(i * .025 + t * .08, j * .03 - t * .05) + .3) * 1.2 * (i / W))), o = (j * W + i) * 4;
        im.data[o] = lerp(B >> 16, A >> 16, k); im.data[o + 1] = lerp((B >> 8) & 255, (A >> 8) & 255, k); im.data[o + 2] = lerp(B & 255, A & 255, k); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); c.drawImage(off, 0, 0, w, h); } }; },
  synth(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const hz = h * .62, cx = w * .7;
    const g = c.createLinearGradient(0, hz - 220, 0, hz); g.addColorStop(0, p.accent); g.addColorStop(1, rgba(p.accent, .3)); c.fillStyle = g; c.beginPath(); c.arc(cx, hz, 200, Math.PI, 0); c.fill();
    c.fillStyle = p.bg; for (let i = 0; i < 7; i++) c.fillRect(cx - 210, hz - 18 - i * 22, 420, 3 + i * .8);
    c.strokeStyle = rgba(p.accent, .5); for (let i = 0; i < 16; i++) { const k = ((i + t * .8) % 16) / 16, y = hz + k * k * (h - hz); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(cx + i * 20, hz); c.lineTo(cx + i * 160, h); c.stroke(); } } }; },
  cubes(p) { const R = rnd(54); const cs = Array.from({ length: 9 }, () => ({ x: .4 + R() * .55, y: .1 + R() * .8, s: 25 + R() * 45, r: R() * 6 }));
    const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]], E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.strokeStyle = p.accent; c.lineWidth = 1.6;
      for (const q of cs) { const a = t * .5 + q.r, b = t * .3 + q.r; const P2 = V.map(([x, y, z]) => { let X = x * Math.cos(a) - z * Math.sin(a), Z = x * Math.sin(a) + z * Math.cos(a), Y = y * Math.cos(b) - Z * Math.sin(b); return [q.x * w + X * q.s, q.y * h + Y * q.s]; });
        c.beginPath(); for (const [i, j] of E) { c.moveTo(...P2[i]); c.lineTo(...P2[j]); } c.stroke(); } } }; },
  torus(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const cx = w * .7, cy = h * .5;
    for (let i = 0; i < 60; i++) for (let j = 0; j < 24; j++) { const u = i / 60 * T2 + t * .2, v = j / 24 * T2; const x = (180 + 70 * Math.cos(v)) * Math.cos(u), y = (180 + 70 * Math.cos(v)) * Math.sin(u), z = 70 * Math.sin(v);
      const a = t * .3, Y = y * Math.cos(a) - z * Math.sin(a), Z = y * Math.sin(a) + z * Math.cos(a), k = (Z + 250) / 500; c.fillStyle = rgba(p.accent, .1 + k * .8); c.fillRect(cx + x, cy + Y * .9, 2, 2); } } }; },
  ridges(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.lineWidth = 1.5;
    for (let r = 0; r < 34; r++) { const y0 = h * .15 + r * h * .022; c.beginPath();
      for (let x = w * .35; x <= w * .95; x += 6) { const u = (x - w * .65) / (w * .3), peak = Math.exp(-u * u * 4) * Math.max(0, noise(x * .02, r * .3 + t * .2) + .3) * 90; const y = y0 - peak; x === w * .35 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.lineTo(w * .95, h); c.lineTo(w * .35, h); c.closePath(); c.fillStyle = p.bg; c.fill(); c.strokeStyle = p.accent; c.stroke(); } } }; },
  bubbles(p) { const R = rnd(57); const b = Array.from({ length: 70 }, () => ({ x: .35 + R() * .65, y: R(), r: 3 + R() * 18, s: .3 + R() }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); for (const q of b) { const y = (1 - ((q.y + t * .05 * q.s) % 1)) * (h + 40) - 20, x = q.x * w + Math.sin(t * 2 * q.s + q.r) * 8;
      c.strokeStyle = rgba(p.accent, .55); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, q.r, 0, T2); c.stroke(); c.fillStyle = rgba(p.accent, .12); c.fill(); } } }; },
  mosaic(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const s = 36;
    for (let y = 0; y < h; y += s) for (let x = w * .3 - (w * .3) % s; x < w; x += s) { const v = noise(x * .01 + t * .3, y * .01 - t * .2); if (v > .05) { c.fillStyle = rgba(p.accent, Math.min(.9, v * 2.4)); rrect(c, x + 3, y + 3, s - 6, s - 6, 5); c.fill(); } } } }; },
  marquee(p) { const L = ['ЗАМОВЛЕННЯ', 'ОПЛАТА', 'НОВА ПОШТА', 'СКЛАД', 'CRM', 'ВІТРИНА'];
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.font = `800 ${h * .16}px system-ui, sans-serif`; c.textBaseline = 'middle'; c.lineWidth = 1.5;
      for (let r = 0; r < 5; r++) { const str = (L.join('  ·  ') + '  ·  ').repeat(3), tw = c.measureText(L.join('  ·  ') + '  ·  ').width, dir = r % 2 ? 1 : -1;
        const x = ((t * 40 * dir) % tw) - tw; c.strokeStyle = rgba(p.accent, r === 2 ? .7 : .25); c.strokeText(str, x, h * (.12 + r * .2)); } } }; },
  ink(p) { let pts = []; return { trail: true, draw(c, w, h, t, m) { const x = m ? m.x : w * (.65 + .25 * Math.sin(t * .7)), y = m ? m.y : h * (.5 + .3 * Math.sin(t * 1.1));
    pts.push({ x, y }); if (pts.length > 70) pts.shift(); clear(c, w, h, p.bg);
    for (let i = 1; i < pts.length; i++) { c.strokeStyle = rgba(p.accent, i / pts.length); c.lineWidth = i / pts.length * 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[i - 1].x, pts[i - 1].y); c.lineTo(pts[i].x, pts[i].y); c.stroke(); } } }; },
  kaleido(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const cx = w * .7, cy = h * .5;
    for (let s = 0; s < 12; s++) { c.save(); c.translate(cx, cy); c.rotate(s * T2 / 12 + t * .05); if (s % 2) c.scale(1, -1);
      for (let i = 0; i < 6; i++) { const r = 40 + i * 50 + Math.sin(t + i) * 20, a = .3 + Math.sin(t * .7 + i) * .2; c.fillStyle = rgba(p.accent, .12 + i * .04); c.beginPath(); c.ellipse(r, 0, 26 + i * 4, 10 + i * 2, a, 0, T2); c.fill(); } c.restore(); } } }; },
  dunes(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg);
    for (let l = 0; l < 7; l++) { c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 8) { const y = h * (.35 + l * .1) + Math.sin(x * .004 + l + t * .15 * (l % 2 ? 1 : -1)) * 40 + noise(x * .003, l) * 60; c.lineTo(x, y); }
      c.lineTo(w, h); c.closePath(); c.fillStyle = mix(p.bg, p.accent, .15 + l * .12); c.fill(); } } }; },
  tunnel(p) { return { draw(c, w, h, t) { clear(c, w, h, p.bg); const cx = w * .7, cy = h * .5; c.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { const k = ((i + t * 1.2) % 18) / 18, s = Math.pow(k, 2.2) * Math.max(w, h) * 1.2; c.strokeStyle = rgba(p.accent, k); c.strokeRect(cx - s / 2, cy - s / 2 * .7, s, s * .7); }
    c.strokeStyle = rgba(p.accent, .3); for (const [a, b] of [[-1,-1],[1,-1],[1,1],[-1,1]]) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + a * w, cy + b * w * .7); c.stroke(); } } }; },
  sparks(p) { const R = rnd(64); let bolt = null, at = 0;
    return { draw(c, w, h, t) { clear(c, w, h, p.bg, .3); if (t - at > 1.6) { at = t; bolt = []; let x = w * (.45 + R() * .5), y = 0; while (y < h) { bolt.push([x, y]); x += (R() - .5) * 60; y += 20 + R() * 30; } }
      if (bolt && t - at < .5) { const a = 1 - (t - at) / .5; c.strokeStyle = rgba(p.accent, a); c.lineWidth = 2.5; c.shadowColor = p.accent; c.shadowBlur = 20; c.beginPath(); bolt.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.shadowBlur = 0; } } }; },
  fireflies(p) { const R = rnd(65); const f = Array.from({ length: 60 }, () => ({ x: .3 + R() * .7, y: R(), s: R() * 9 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); for (const q of f) { const x = (q.x + noise(q.s, t * .1) * .2) * w, y = (q.y + noise(q.s + 9, t * .1) * .2) * h, a = (Math.sin(t * 1.5 + q.s * 3) + 1) / 2;
      const g = c.createRadialGradient(x, y, 0, x, y, 18); g.addColorStop(0, rgba(p.accent, a)); g.addColorStop(1, rgba(p.accent, 0)); c.fillStyle = g; c.fillRect(x - 18, y - 18, 36, 36); } } }; },
  planes(p) { const R = rnd(66); const pl = Array.from({ length: 10 }, () => ({ y: R(), s: .4 + R() * .6, o: R(), a: R() * .4 - .2 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); for (const q of pl) { const k = (q.o + t * .05 * q.s) % 1, x = -60 + k * (w + 120), y = q.y * h + Math.sin(k * 9) * 30;
      c.strokeStyle = rgba(p.accent, .25); c.setLineDash([4, 6]); c.beginPath(); c.moveTo(x - 140, y + 20); c.quadraticCurveTo(x - 70, y - 10, x - 18, y); c.stroke(); c.setLineDash([]);
      c.save(); c.translate(x, y); c.rotate(q.a); c.fillStyle = p.accent; c.beginPath(); c.moveTo(18, 0); c.lineTo(-14, -10); c.lineTo(-6, 0); c.lineTo(-14, 10); c.closePath(); c.fill(); c.restore(); } } }; },
  coins(p) { const R = rnd(67); const cs = Array.from({ length: 40 }, () => ({ x: .35 + R() * .65, y: R(), s: .3 + R() * .7, r: 10 + R() * 12, ph: R() * 6 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const q of cs) { const y = ((q.y + t * .06 * q.s) % 1) * (h + 60) - 30, x = q.x * w, sx = Math.abs(Math.cos(t * 2 * q.s + q.ph));
        c.save(); c.translate(x, y); c.scale(sx, 1); c.fillStyle = p.accent; c.beginPath(); c.arc(0, 0, q.r, 0, T2); c.fill(); c.fillStyle = p.bg; c.font = `700 ${q.r}px system-ui`; c.fillText('₴', 0, 1); c.restore(); } } }; },
  barcode(p) { const R = rnd(68); const bars = Array.from({ length: 6 }, () => Array.from({ length: 40 }, () => 1 + Math.floor(R() * 4)));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg);
      bars.forEach((b, r) => { let x = w * .4; const y = h * (.1 + r * .14); b.forEach((bw, i) => { if (i % 2 === 0) { c.fillStyle = rgba(p.ink, .18); c.fillRect(x, y, bw * 2, h * .09); } x += bw * 2 + 1; }); });
      const sy = h * (.5 + .45 * Math.sin(t * 1.2)); c.fillStyle = rgba(p.accent, .85); c.fillRect(w * .36, sy, w * .6, 2); const g = c.createLinearGradient(0, sy - 40, 0, sy); g.addColorStop(0, rgba(p.accent, 0)); g.addColorStop(1, rgba(p.accent, .18)); c.fillStyle = g; c.fillRect(w * .36, sy - 40, w * .6, 40); } }; },
  heatmap(p) { const S = 10; let off = null;
    return { fps: 30, draw(c, w, h, t) { const W = Math.ceil(w / S), H = Math.ceil(h / S); if (!off || off.width !== W) { off = document.createElement('canvas'); off.width = W; off.height = H; }
      const x = off.getContext('2d'), im = x.createImageData(W, H), A = parseInt(p.accent.slice(1), 16), B = parseInt(p.bg.slice(1), 16);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = 0; for (let k = 0; k < 5; k++) { const bx = W * (.55 + .35 * Math.sin(t * .2 + k * 1.7)), by = H * (.5 + .4 * Math.cos(t * .17 + k * 2.3)); v += Math.exp(-((i - bx) ** 2 + (j - by) ** 2) / 120); }
        const k = Math.min(1, v), o = (j * W + i) * 4; im.data[o] = lerp(B >> 16, A >> 16, k); im.data[o + 1] = lerp((B >> 8) & 255, (A >> 8) & 255, k); im.data[o + 2] = lerp(B & 255, A & 255, k); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); c.drawImage(off, 0, 0, w, h); } }; },
  ripples(p) { const R = rnd(70); let drops = [];
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); if (R() < .04) drops.push({ x: (.35 + R() * .65) * w, y: R() * h, t0: t }); drops = drops.filter(d => t - d.t0 < 4);
      for (const d of drops) for (let i = 0; i < 3; i++) { const k = (t - d.t0) / 4, r = k * 220 - i * 18; if (r > 0) { c.strokeStyle = rgba(p.accent, (1 - k) * .6); c.lineWidth = 1.5; c.beginPath(); c.ellipse(d.x, d.y, r, r * .5, 0, 0, T2); c.stroke(); } } } }; },
  traffic(p) { const R = rnd(71); const lanes = Array.from({ length: 14 }, () => ({ s: .5 + R() * 1.5, o: R() * 100, d: R() < .5 ? 1 : -1 }));
    return { draw(c, w, h, t) { clear(c, w, h, p.bg); lanes.forEach((l, i) => { const y = h * (.08 + i * .065);
      c.strokeStyle = rgba(p.ink, .06); c.beginPath(); c.moveTo(w * .3, y); c.lineTo(w, y); c.stroke();
      for (let k = 0; k < 8; k++) { const x = w * .3 + (((k * 160 + l.o + t * 80 * l.s * l.d) % (w * .7 + 160)) + w * .7 + 160) % (w * .7 + 160) - 80; c.fillStyle = rgba(p.accent, .3 + (k % 3) * .25); rrect(c, x, y - 3, 30 + (k % 2) * 30, 6, 3); c.fill(); } }); } }; },
});
