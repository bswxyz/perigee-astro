/* ============================================================
   Perigee — interactions & the deep-space starfield
   ES module. Progressive enhancement: the page is fully
   readable with this file blocked. three.js is loaded via a
   guarded dynamic import so a CDN miss never breaks the rest.
   ============================================================ */
'use strict';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;

/* seeded RNG so procedural art is stable across reloads */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------
   Astronomy — real horizontal-coordinate transform.
   Alt/Az actually track with local sidereal time.
   --------------------------------------------------------- */
const SITE = { lat: 28.7606, lon: -17.8814 }; // network-representative site (La Palma)
function localSiderealHours(date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;   // Unix ms → Julian Date
  const d = jd - 2451545.0;                            // days since J2000.0
  let gmst = 18.697374558 + 24.06570982441908 * d;     // Greenwich mean sidereal (hours)
  let lst = gmst + SITE.lon / 15;
  lst = ((lst % 24) + 24) % 24;
  return lst;
}
function altAz(raHours, decDeg, lstHours) {
  const ha = ((lstHours - raHours) * 15) * DEG;        // hour angle → radians
  const dec = decDeg * DEG, lat = SITE.lat * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  let az = Math.atan2(-Math.cos(dec) * Math.sin(ha),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha));
  az = ((az / DEG) + 360) % 360;
  return { alt: alt / DEG, az };
}
const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];

/* ---------------------------------------------------------
   Reveals + hero intro
   --------------------------------------------------------- */
(function reveals() {
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero && hero.classList.add('loaded'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

/* ---------------------------------------------------------
   Catalogue — deep-sky objects (real coordinates)
   --------------------------------------------------------- */
const CAT = [
  { id: 'M42', name: 'Orion Nebula', cat: 'M42 · NGC 1976', type: 'Emission nebula · Orion', kind: 'emission',
    ra: 5.588, raS: '05ʰ 35ᵐ 17ˢ', decS: '−05° 23′ 28″', dec: -5.39, mag: '4.0', size: '85′ × 60′',
    integ: '6.2 h', subs: '744 × 30 s', filt: 'Hα · OIII · SII', node: 'La Palma Array', nx: .30, ny: .62 },
  { id: 'M31', name: 'Andromeda', cat: 'M31 · NGC 224', type: 'Spiral galaxy · Andromeda', kind: 'galaxy',
    ra: 0.712, raS: '00ʰ 42ᵐ 44ˢ', decS: '+41° 16′ 09″', dec: 41.27, mag: '3.4', size: '3.2° × 1.0°',
    integ: '9.1 h', subs: '546 × 60 s', filt: 'LRGB', node: 'Cairngorm Bothy', nx: .70, ny: .28 },
  { id: 'M45', name: 'Pleiades', cat: 'M45 · Melotte 22', type: 'Open cluster · Taurus', kind: 'cluster',
    ra: 3.790, raS: '03ʰ 47ᵐ 24ˢ', decS: '+24° 07′ 00″', dec: 24.12, mag: '1.6', size: '110′',
    integ: '4.4 h', subs: '264 × 60 s', filt: 'LRGB', node: 'La Palma Array', nx: .18, ny: .34 },
  { id: 'M51', name: 'Whirlpool', cat: 'M51 · NGC 5194', type: 'Spiral galaxy · Canes Venatici', kind: 'galaxy',
    ra: 13.498, raS: '13ʰ 29ᵐ 53ˢ', decS: '+47° 11′ 43″', dec: 47.20, mag: '8.4', size: '11′ × 7′',
    integ: '12.6 h', subs: '756 × 60 s', filt: 'LRGB + Hα', node: 'Mauna Deck', nx: .55, ny: .18 },
  { id: 'M27', name: 'Dumbbell', cat: 'M27 · NGC 6853', type: 'Planetary nebula · Vulpecula', kind: 'planetary',
    ra: 19.994, raS: '19ʰ 59ᵐ 36ˢ', decS: '+22° 43′ 16″', dec: 22.72, mag: '7.4', size: '8.0′ × 5.7′',
    integ: '7.8 h', subs: '468 × 60 s', filt: 'OIII · Hα', node: 'La Palma Array', nx: .82, ny: .55 },
  { id: 'M13', name: 'Hercules Cluster', cat: 'M13 · NGC 6205', type: 'Globular cluster · Hercules', kind: 'globular',
    ra: 16.695, raS: '16ʰ 41ᵐ 41ˢ', decS: '+36° 27′ 37″', dec: 36.46, mag: '5.8', size: '20′',
    integ: '3.6 h', subs: '216 × 60 s', filt: 'LRGB', node: 'Karoo Plateau', nx: .46, ny: .48 },
  { id: 'NGC7000', name: 'North America', cat: 'NGC 7000 · Caldwell 20', type: 'Emission nebula · Cygnus', kind: 'emission',
    ra: 20.978, raS: '20ʰ 58ᵐ 47ˢ', decS: '+44° 19′ 48″', dec: 44.33, mag: '4.0', size: '120′ × 100′',
    integ: '10.5 h', subs: '630 × 60 s', filt: 'Hα · OIII · SII', node: 'Warrumbungle', nx: .64, ny: .70 },
  { id: 'M8', name: 'Lagoon Nebula', cat: 'M8 · NGC 6523', type: 'Emission nebula · Sagittarius', kind: 'emission',
    ra: 18.061, raS: '18ʰ 03ᵐ 41ˢ', decS: '−24° 23′ 00″', dec: -24.38, mag: '6.0', size: '90′ × 40′',
    integ: '5.9 h', subs: '354 × 60 s', filt: 'Hα · OIII · SII', node: 'Karoo Plateau', nx: .88, ny: .82 },
  { id: 'NGC253', name: 'Sculptor Galaxy', cat: 'NGC 253 · Caldwell 65', type: 'Spiral galaxy · Sculptor', kind: 'galaxy',
    ra: 0.793, raS: '00ʰ 47ᵐ 33ˢ', decS: '−25° 17′ 18″', dec: -25.29, mag: '7.1', size: '27′ × 7′',
    integ: '8.2 h', subs: '492 × 60 s', filt: 'LRGB', node: 'Karoo Plateau', nx: .10, ny: .80 },
];

/* ---------------------------------------------------------
   Procedural deep-sky renders (SVG — no photographs)
   --------------------------------------------------------- */
function starDots(rnd, n, spread) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = (rnd() * 400).toFixed(1), y = (rnd() * 300).toFixed(1);
    const r = (0.3 + rnd() * (spread || 1.2)).toFixed(2);
    const o = (0.25 + rnd() * 0.6).toFixed(2);
    const tint = rnd() < 0.12 ? '#9fe9dd' : rnd() < 0.12 ? '#b9b0ff' : '#e8eefc';
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${tint}" opacity="${o}"/>`;
  }
  return s;
}
function glint(x, y, size, col) {
  return `<g opacity=".9"><circle cx="${x}" cy="${y}" r="${size * 1.6}" fill="${col}" opacity=".16"/>
    <circle cx="${x}" cy="${y}" r="${size * .5}" fill="#fff"/>
    <line x1="${x - size * 2.4}" y1="${y}" x2="${x + size * 2.4}" y2="${y}" stroke="${col}" stroke-width=".6" opacity=".55"/>
    <line x1="${x}" y1="${y - size * 2.4}" x2="${x}" y2="${y + size * 2.4}" stroke="${col}" stroke-width=".6" opacity=".55"/></g>`;
}
function makeSky(o) {
  const rnd = mulberry32([...o.id].reduce((a, c) => a + c.charCodeAt(0), 7) * 2654435761);
  const s = o.id.replace(/\W/g, '');
  let body = '', defs = '';
  const turb = `<filter id="t${s}"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.026" numOctaves="4" seed="${(rnd() * 90) | 0}" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.28"/></filter>`;

  if (o.kind === 'emission') {
    defs += turb;
    defs += `<radialGradient id="c${s}" cx="42%" cy="56%" r="62%">
      <stop offset="0%" stop-color="#ff6f8f" stop-opacity=".55"/><stop offset="38%" stop-color="#7c6cff" stop-opacity=".42"/>
      <stop offset="70%" stop-color="#43e0c8" stop-opacity=".22"/><stop offset="100%" stop-color="#04060c" stop-opacity="0"/></radialGradient>`;
    body += `<rect width="400" height="300" fill="url(#c${s})"/>`;
    body += `<rect width="400" height="300" fill="#8fe6d8" filter="url(#t${s})" opacity=".5" style="mix-blend-mode:screen"/>`;
    body += `<ellipse cx="168" cy="168" rx="120" ry="86" fill="#ff7f9c" opacity=".10"/>`;
  } else if (o.kind === 'galaxy') {
    defs += `<radialGradient id="c${s}" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#fff4e6" stop-opacity=".95"/><stop offset="18%" stop-color="#ffe1b8" stop-opacity=".7"/>
      <stop offset="55%" stop-color="#8f7bff" stop-opacity=".28"/><stop offset="100%" stop-color="#04060c" stop-opacity="0"/></radialGradient>`;
    const rot = (-30 + rnd() * 60).toFixed(1);
    body += `<g transform="translate(200 150) rotate(${rot})">
      <ellipse cx="0" cy="0" rx="180" ry="52" fill="#7c6cff" opacity=".16"/>
      <ellipse cx="0" cy="0" rx="150" ry="34" fill="#43e0c8" opacity=".10"/>
      <ellipse cx="0" cy="0" rx="120" ry="60" fill="url(#c${s})"/>
      <ellipse cx="0" cy="0" rx="90" ry="6" fill="#04060c" opacity=".45"/></g>`;
  } else if (o.kind === 'planetary') {
    defs += `<radialGradient id="c${s}" cx="50%" cy="50%" r="52%">
      <stop offset="0%" stop-color="#8be9ff" stop-opacity=".2"/><stop offset="45%" stop-color="#43e0c8" stop-opacity=".55"/>
      <stop offset="72%" stop-color="#7c6cff" stop-opacity=".4"/><stop offset="100%" stop-color="#04060c" stop-opacity="0"/></radialGradient>`;
    body += `<circle cx="200" cy="150" r="86" fill="url(#c${s})"/>
      <circle cx="200" cy="150" r="52" fill="#e8eefc" opacity=".06"/>
      <circle cx="200" cy="150" r="3" fill="#fff"/>`;
  } else { // clusters (open / globular)
    defs += `<radialGradient id="c${s}" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#bfe9ff" stop-opacity=".28"/><stop offset="100%" stop-color="#04060c" stop-opacity="0"/></radialGradient>`;
    body += `<rect width="400" height="300" fill="url(#c${s})"/>`;
    const dense = o.kind === 'globular' ? 260 : 90;
    for (let i = 0; i < dense; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = o.kind === 'globular' ? Math.pow(rnd(), 1.7) * 110 : Math.pow(rnd(), .8) * 130;
      const x = (200 + Math.cos(a) * rad + (rnd() - .5) * 20).toFixed(1);
      const y = (150 + Math.sin(a) * rad * (o.kind === 'globular' ? 1 : .8) + (rnd() - .5) * 20).toFixed(1);
      const r = (0.5 + rnd() * 1.4).toFixed(2);
      const tint = rnd() < .2 ? '#bfe0ff' : rnd() < .15 ? '#ffe6c8' : '#e8eefc';
      body += `<circle cx="${x}" cy="${y}" r="${r}" fill="${tint}" opacity="${(.4 + rnd() * .55).toFixed(2)}"/>`;
    }
  }

  const stars = starDots(rnd, 90, 1.1);
  const glints = glint(60 + rnd() * 280, 40 + rnd() * 220, 2.2, '#9fe9dd')
    + glint(60 + rnd() * 280, 40 + rnd() * 220, 1.8, '#b9b0ff');
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Procedural render of ${o.name}">
    <defs>${defs}</defs><rect width="400" height="300" fill="#04060c"/>${body}${stars}${glints}</svg>`;
}

/* ---------------------------------------------------------
   Observations gallery
   --------------------------------------------------------- */
(function observations() {
  const grid = document.getElementById('obsGrid');
  if (!grid) return;
  const items = ['M42', 'M31', 'M45', 'M51', 'M27', 'NGC7000'].map(id => CAT.find(o => o.id === id));
  grid.innerHTML = items.map(o => `
    <article class="obs" role="listitem" tabindex="0" aria-label="${o.name}, ${o.type}">
      <div class="obs-sky">${makeSky(o)}<span class="obs-badge">${o.cat}</span></div>
      <div class="obs-body">
        <h3 class="obs-name">${o.name}</h3>
        <p class="obs-sub">${o.type}</p>
        <dl class="obs-meta">
          <div><dt>R.A.</dt><dd>${o.raS}</dd></div>
          <div><dt>Dec</dt><dd>${o.decS}</dd></div>
          <div><dt>Mag</dt><dd>${o.mag}</dd></div>
          <div><dt>Size</dt><dd>${o.size}</dd></div>
          <div><dt>Integration</dt><dd>${o.integ}</dd></div>
          <div><dt>Subs</dt><dd>${o.subs}</dd></div>
        </dl>
        <div class="obs-foot"><span>${o.filt}</span><span class="obs-node">◍ ${o.node}</span></div>
      </div>
    </article>`).join('');
})();

/* ---------------------------------------------------------
   Network nodes
   --------------------------------------------------------- */
const NODES = [
  { name: 'Atacama Ridge', loc: 'Cerro Paranal, Chile', lat: '−24.6272°', lon: '−70.4039°', el: '2635 m', see: '0.9″', ap: '0.6 m RC', status: 'live', target: 'NGC 6357 · War & Peace' },
  { name: 'Mauna Deck', loc: 'Hawaiʻi, USA', lat: '+19.8207°', lon: '−155.4681°', el: '3068 m', see: '1.1″', ap: '0.5 m Newt', status: 'slew', target: 'slewing → M51' },
  { name: 'La Palma Array', loc: 'Canary Islands, ES', lat: '+28.7606°', lon: '−17.8814°', el: '2396 m', see: '1.0″', ap: '0.4 m APO', status: 'live', target: 'M27 · Dumbbell' },
  { name: 'Karoo Plateau', loc: 'Sutherland, ZA', lat: '−32.3789°', lon: '+20.8107°', el: '1798 m', see: '1.3″', ap: '0.7 m CDK', status: 'live', target: 'NGC 253 · Sculptor' },
  { name: 'Warrumbungle', loc: 'Coonabarabran, AU', lat: '−31.2755°', lon: '+149.067°', el: '1165 m', see: '1.6″', ap: '0.35 m Newt', status: 'idle', target: 'stowed · daylight' },
  { name: 'Cairngorm Bothy', loc: 'Aviemore, Scotland', lat: '+57.1200°', lon: '−3.8300°', el: '620 m', see: '2.4″', ap: '0.3 m APO', status: 'cloud', target: 'clouded · 6⁄8 oktas' },
];
const STATUS = { live: ['LIVE', 'st-live'], slew: ['SLEWING', 'st-slew'], idle: ['IDLE', 'st-idle'], cloud: ['CLOUDED', 'st-cloud'] };
(function network() {
  const grid = document.getElementById('nodeGrid');
  if (!grid) return;
  grid.innerHTML = NODES.map((n, i) => {
    const [lbl, cls] = STATUS[n.status];
    return `<article class="node" role="listitem" tabindex="0" aria-label="${n.name}, ${n.loc}, status ${lbl}">
      <div class="node-head">
        <div><div class="node-name">${n.name}</div><div class="node-loc">${n.loc}</div></div>
        <span class="node-status ${cls}"><span class="sd"></span>${lbl}</span>
      </div>
      <div class="node-meta">
        <div><b>Latitude</b><span>${n.lat}</span></div>
        <div><b>Longitude</b><span>${n.lon}</span></div>
        <div><b>Elevation</b><span>${n.el}</span></div>
        <div><b>Aperture</b><span>${n.ap}</span></div>
      </div>
      <div class="node-target"><span class="nt-k">Now pointed</span><span class="nt-v" data-node="${i}">${n.target}</span>
        <span class="nt-k" style="margin-left:auto">Seeing ${n.see}</span></div>
    </article>`;
  }).join('');

  // subtle "live" feel — occasionally re-point the slewing node (pausable, motion only)
  if (reduce) return;
  const el = grid.querySelector('.nt-v[data-node="1"]');
  const cyc = ['slewing → M51', 'centering M51 · Whirlpool', 'guiding · 0.42″ RMS', 'M51 · Whirlpool'];
  let k = 0, timer = null;
  const tick = () => { k = (k + 1) % cyc.length; if (el) el.textContent = cyc[k]; };
  const run = () => { if (!timer && !document.hidden) timer = setInterval(tick, 4200); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : run());
  run();
})();

/* ---------------------------------------------------------
   Sky console — interactive reticle + object lock (2D canvas)
   --------------------------------------------------------- */
(function skyConsole() {
  const canvas = document.getElementById('scope');
  const hit = document.getElementById('scopeHit');
  if (!canvas || !hit) return;
  const ctx = canvas.getContext('2d');
  const D = {
    cat: document.getElementById('dCat'), lock: document.getElementById('dLock'), name: document.getElementById('dName'),
    type: document.getElementById('dType'), ra: document.getElementById('dRa'), dec: document.getElementById('dDec'),
    alt: document.getElementById('dAlt'), az: document.getElementById('dAz'), mag: document.getElementById('dMag'),
    size: document.getElementById('dSize'), node: document.getElementById('dNode'), status: document.getElementById('vpStatus'),
    card: document.getElementById('detail'),
  };
  const W = canvas.width, H = canvas.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);

  // background field for the console (seeded, static)
  const rnd = mulberry32(20260708);
  const bg = Array.from({ length: 420 }, () => ({
    x: rnd() * W, y: rnd() * H, r: 0.3 + rnd() * 1.3, o: 0.2 + rnd() * 0.6,
    ph: rnd() * Math.PI * 2, tint: rnd() < .1 ? '#7fe6d6' : rnd() < .1 ? '#b0a6ff' : '#e8eefc',
  }));
  // catalogued objects placed in the viewport
  const objs = CAT.map(o => ({ ...o, x: o.nx * W, y: o.ny * H }));

  const target = { x: W * 0.5, y: H * 0.42 };
  const ret = { x: target.x, y: target.y };
  let locked = null, lockT = 0, active = false;

  function setTarget(px, py) {
    const r = canvas.getBoundingClientRect();
    target.x = clamp((px - r.left) / r.width * W, 16, W - 16);
    target.y = clamp((py - r.top) / r.height * H, 16, H - 16);
    active = true;
  }
  hit.addEventListener('pointermove', e => setTarget(e.clientX, e.clientY));
  hit.addEventListener('pointerdown', e => { setTarget(e.clientX, e.clientY); if (reduce) draw(); });
  hit.addEventListener('pointerleave', () => { active = false; });
  hit.addEventListener('keydown', e => {
    const step = e.shiftKey ? 60 : 26; let used = true;
    if (e.key === 'ArrowLeft') target.x = clamp(target.x - step, 16, W - 16);
    else if (e.key === 'ArrowRight') target.x = clamp(target.x + step, 16, W - 16);
    else if (e.key === 'ArrowUp') target.y = clamp(target.y - step, 16, H - 16);
    else if (e.key === 'ArrowDown') target.y = clamp(target.y + step, 16, H - 16);
    else used = false;
    if (used) { e.preventDefault(); active = true; if (reduce) { ret.x = target.x; ret.y = target.y; draw(); } }
  });

  function nearest() {
    let best = null, bd = 1e9;
    for (const o of objs) {
      const d = Math.hypot(o.x - ret.x, o.y - ret.y);
      if (d < bd) { bd = d; best = o; }
    }
    return bd < 70 ? best : null;
  }
  function updateDetail(o) {
    if (!o) {
      D.status.textContent = 'SEARCHING'; D.card.classList.remove('locked');
      D.lock.textContent = 'NO LOCK'; D.cat.textContent = '— · —';
      D.name.textContent = 'Sweep to acquire a target';
      D.type.textContent = 'Move the reticle over the field to lock onto a deep-sky object.';
      D.ra.textContent = D.dec.textContent = D.alt.textContent = D.az.textContent = D.mag.textContent = D.size.textContent = '—';
      D.node.textContent = 'No node assigned';
      return;
    }
    const lst = localSiderealHours();
    const { alt, az } = altAz(o.ra, o.dec, lst);
    D.status.textContent = alt > 0 ? 'LOCKED' : 'BELOW HORIZON';
    D.card.classList.add('locked'); D.lock.textContent = 'LOCKED';
    D.cat.textContent = o.cat; D.name.textContent = o.name; D.type.textContent = o.type;
    D.ra.textContent = o.raS; D.dec.textContent = o.decS;
    D.alt.textContent = (alt >= 0 ? '+' : '−') + Math.abs(alt).toFixed(1) + '°';
    D.az.textContent = az.toFixed(1) + '° ' + compass(az);
    D.mag.textContent = o.mag; D.size.textContent = o.size;
    D.node.textContent = '◍ ' + o.node + (alt > 0 ? ' · tracking' : ' · queued');
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // faint grid
    ctx.strokeStyle = 'rgba(232,238,252,0.04)'; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(W / 6 * i, 0); ctx.lineTo(W / 6 * i, H); ctx.stroke(); }
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, H / 4 * i); ctx.lineTo(W, H / 4 * i); ctx.stroke(); }
    // background stars (twinkle unless reduced)
    const time = (t || 0) * 0.001;
    for (const s of bg) {
      const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(time * 1.8 + s.ph);
      ctx.globalAlpha = s.o * tw; ctx.fillStyle = s.tint;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // catalogued objects — soft glow
    for (const o of objs) {
      const col = o.kind === 'galaxy' ? '124,108,255' : o.kind === 'emission' ? '67,224,200' : '190,224,255';
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 16);
      g.addColorStop(0, `rgba(${col},0.9)`); g.addColorStop(0.4, `rgba(${col},0.28)`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, 16, 0, 7); ctx.fill();
      ctx.fillStyle = '#eef4ff'; ctx.beginPath(); ctx.arc(o.x, o.y, 1.6, 0, 7); ctx.fill();
      if (locked === o) {
        // label for the locked object
        ctx.fillStyle = 'rgba(67,224,200,0.95)';
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.fillText(o.id, o.x + 14, o.y - 10);
      }
    }
    // reticle
    ret.x = reduce ? target.x : lerp(ret.x, target.x, 0.18);
    ret.y = reduce ? target.y : lerp(ret.y, target.y, 0.18);
    const near = nearest();
    if (near !== locked) { locked = near; lockT = t || 0; updateDetail(near); }
    const rx = ret.x, ry = ret.y;
    const on = !!locked;
    ctx.strokeStyle = on ? 'rgba(67,224,200,0.95)' : 'rgba(143,155,179,0.7)';
    ctx.lineWidth = 1.4;
    // ring
    const rr = on ? 22 : 16;
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, 7); ctx.stroke();
    // brackets
    const b = rr + 8;
    ctx.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      ctx.moveTo(rx + sx * b, ry + sy * (b - 8)); ctx.lineTo(rx + sx * b, ry + sy * b); ctx.lineTo(rx + sx * (b - 8), ry + sy * b);
    });
    ctx.stroke();
    // crosshair gap
    ctx.beginPath();
    ctx.moveTo(rx - rr - 6, ry); ctx.lineTo(rx - 5, ry); ctx.moveTo(rx + 5, ry); ctx.lineTo(rx + rr + 6, ry);
    ctx.moveTo(rx, ry - rr - 6); ctx.lineTo(rx, ry - 5); ctx.moveTo(rx, ry + 5); ctx.lineTo(rx, ry + rr + 6);
    ctx.stroke();
    // plate-solve scan sweep on fresh lock
    if (on && !reduce && t - lockT < 620) {
      const p = (t - lockT) / 620;
      ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = 'rgba(67,224,200,0.9)';
      ctx.beginPath(); ctx.arc(rx, ry, 10 + p * 40, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  // loop (paused when tab hidden or when the console is off-screen)
  let raf = null, running = false, visible = true;
  const frame = t => { draw(t); raf = requestAnimationFrame(frame); };
  const start = () => { if (!running && !reduce && visible && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } };
  const halt = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };
  document.addEventListener('visibilitychange', () => document.hidden ? halt() : start());
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    visible ? start() : halt();
  }, { threshold: 0.05 }).observe(canvas);

  updateDetail(null);
  draw(0);            // always paint at least one static frame (covers reduced-motion)
  start();
})();

/* ---------------------------------------------------------
   Tonight status band — light live readouts
   --------------------------------------------------------- */
(function tonight() {
  const obs = document.getElementById('tObs'), lst = document.getElementById('tLst'),
    see = document.getElementById('tSeeing'), tr = document.getElementById('tTransit');
  if (!lst) return;
  const fmtLst = h => { const H = h | 0, M = ((h - H) * 60) | 0, S = ((((h - H) * 60) - M) * 60) | 0;
    return `${String(H).padStart(2, '0')}ʰ ${String(M).padStart(2, '0')}ᵐ ${String(S).padStart(2, '0')}ˢ`; };
  // which catalogued object is nearest transit (hour angle ≈ 0) right now
  const transiting = () => {
    const cur = localSiderealHours();
    let best = CAT[0], bd = 99;
    for (const o of CAT) { let d = Math.abs(((cur - o.ra + 12 + 24) % 24) - 12); if (d < bd) { bd = d; best = o; } }
    return best;
  };
  let base = 890 + ((Math.random() * 60) | 0), seeBase = 1.8;
  const tick = () => {
    lst.textContent = fmtLst(localSiderealHours());
    if (tr) { const o = transiting(); tr.textContent = `${o.id} · ${o.name}`; }
  };
  tick();
  if (reduce) { if (obs) obs.textContent = String(base); return; }
  let t0 = null;
  const soft = ts => {
    if (t0 === null) t0 = ts;
    const e = (ts - t0) / 1000;
    if (obs) obs.textContent = String(base + Math.round(Math.sin(e * 0.25) * 22 + Math.sin(e * 1.7) * 4));
    if (see) see.textContent = (seeBase + Math.sin(e * 0.6) * 0.25).toFixed(1) + '″';
    if (!document.hidden) requestAnimationFrame(soft);
  };
  requestAnimationFrame(soft);
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
})();

/* ---------------------------------------------------------
   Animated counters
   --------------------------------------------------------- */
(function counters() {
  const nums = document.querySelectorAll('.s-num');
  const fmt = (v, dec) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
      io.unobserve(el);
      if (reduce) { el.textContent = fmt(to, dec); continue; }
      const dur = 1400, t0 = performance.now();
      const step = t => { const p = clamp((t - t0) / dur, 0, 1), e2 = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(to * e2, dec); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.5 });
  nums.forEach(n => io.observe(n));
})();

/* ---------------------------------------------------------
   Invite form (demo — nothing is sent)
   --------------------------------------------------------- */
(function invite() {
  const form = document.getElementById('inviteForm'), input = document.getElementById('inviteEmail'),
    note = document.getElementById('inviteNote');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = (input.value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      note.textContent = 'Enter a valid address — demo only, nothing is sent.'; note.classList.remove('ok'); input.focus(); return;
    }
    note.textContent = '✓ Logged locally. Perigee is a design-showcase concept — no invite will arrive.';
    note.classList.add('ok'); input.value = '';
  });
})();

/* ---------------------------------------------------------
   Signature technique — the deep-space particle starfield
   ~72k stars, additive Points, scroll + pointer parallax,
   per-star twinkle, slow drift. Guarded dynamic import so a
   CDN miss keeps the CSS fallback. Skipped under reduced motion.
   --------------------------------------------------------- */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

if (!reduce && webglOK()) {
  import('three').then(THREE => {
    const canvas = document.querySelector('.sky');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 3200);
    camera.position.set(0, 0, 700);

    // geometry — ~72k stars in a deep box volume
    const COUNT = window.innerWidth < 640 ? 42000 : 72000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);
    const rnd = mulberry32(987654321);
    const palette = [
      [0.91, 0.93, 0.99], [0.91, 0.93, 0.99], [0.91, 0.93, 0.99],  // white-blue (majority)
      [0.72, 0.82, 1.00], [0.60, 0.78, 1.00],                       // blue
      [0.26, 0.88, 0.78],                                           // teal
      [0.55, 0.47, 1.00],                                           // violet
      [1.00, 0.86, 0.66],                                           // warm
    ];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rnd() * 2 - 1) * 1700;
      positions[i * 3 + 1] = (rnd() * 2 - 1) * 1300;
      positions[i * 3 + 2] = -1800 + rnd() * 2100;               // -1800 .. 300
      const c = palette[(rnd() * palette.length) | 0];
      const b = 0.55 + rnd() * 0.45;
      colors[i * 3] = c[0] * b; colors[i * 3 + 1] = c[1] * b; colors[i * 3 + 2] = c[2] * b;
      scales[i] = 0.35 + Math.pow(rnd(), 3) * 2.6;                 // a few big, many tiny
      phases[i] = rnd() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const uniforms = {
      uTime: { value: 0 },
      uSize: { value: 7.2 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    };
    const material = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime; uniform float uSize; uniform float uPixelRatio;
        attribute vec3 aColor; attribute float aScale; attribute float aPhase;
        varying vec3 vColor; varying float vTw;
        void main(){
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.55 + 0.45 * sin(uTime * 1.7 + aPhase);
          vTw = tw;
          float size = uSize * aScale * (0.55 + 0.7 * tw) * uPixelRatio * (320.0 / max(-mv.z, 1.0));
          gl_PointSize = clamp(size, 0.0, 28.0 * uPixelRatio);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vTw;
        void main(){
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.0, d);
          a = pow(a, 1.7);
          gl_FragColor = vec4(vColor, a * (0.55 + 0.45 * vTw));
        }`,
    });
    const points = new THREE.Points(geo, material);
    scene.add(points);

    // pointer + scroll parallax
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', e => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5);
      pointer.ty = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
    let scrollY = window.scrollY;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    const clock = new THREE.Clock();
    let raf = null, running = false;
    const render = () => {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      pointer.x = lerp(pointer.x, pointer.tx, 0.04);
      pointer.y = lerp(pointer.y, pointer.ty, 0.04);
      // parallax: pan the camera; near stars shift more than far → real depth
      camera.position.x = pointer.x * 120 + Math.sin(t * 0.05) * 24;
      camera.position.y = -pointer.y * 90 - scrollY * 0.06;
      camera.lookAt(0, -scrollY * 0.045, -400);
      // slow drift / roll
      points.rotation.z = t * 0.006;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    const start = () => { if (!running) { running = true; clock.start(); raf = requestAnimationFrame(render); } };
    const halt = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(uniforms.uPixelRatio.value);
    };
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? halt() : start());
    window.addEventListener('pagehide', () => { halt(); geo.dispose(); material.dispose(); renderer.dispose(); });

    canvas.classList.add('on');   // fade WebGL in, fade CSS fallback out
    start();
  }).catch(() => { /* CDN unavailable — CSS starfield fallback stays */ });
}
