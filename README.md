# Perigee

**Live:** https://bswxyz.github.io/perigee-astro/ · **Build notes:** https://bswxyz.github.io/perigee-astro/guide/

A citizen-astronomy telescope-network landing site with a signature WebGL deep-space starfield and a
working, steerable sky console — part of the [Fable 25 design showcase](https://bswxyz.github.io/fable-hub/).

---

## Concept

Perigee is a network of internet-connected smart telescopes that hobbyist astronomers point, share and
observe through together. The pitch is that the sky is *public*: aim a scope at a faint smudge, let the
field plate-solve and lock, and the whole node watches the same photons arrive — from a rooftop in Lisbon
to a plateau in the Karoo. The site sells that feeling immediately with a starfield you move *through*, then
lets you sweep a reticle across catalogued deep-sky objects and read exactly what a node would broadcast.

## Design system

- **Palette (deep space):**
  `--bg:#05060a` near-black · `--bg-2:#0a0d16` / `--panel:#0c1120` raised surfaces · `--ink:#e8eefc` starlight ·
  `--dim:#8f9bb3` · `--faint:#4a5266` · `--teal:#43e0c8` aurora accent · `--violet:#7c6cff` secondary ·
  `--line:rgba(232,238,252,.10)`. Teal is the live/lock signal (nebulae, LIVE nodes, focus rings); violet is
  the quieter secondary (galaxies, kickers, slewing). Everything sits on near-black so the light is the brightest thing.
- **Type — Newsreader / IBM Plex Sans / IBM Plex Mono.** A celestial-literary optical serif for display and
  object names; a neutral, legible grotesque for body; a mono reserved strictly for coordinates and telemetry
  (RA/Dec, Alt/Az, sidereal time, lat/long) so numbers read as instrumentation, not prose. The pairing gives
  awe (serif) + clarity (sans) + precision (mono) — the site's whole voice in three faces.
- **Signature motion:** an expo-out `cubic-bezier(.19,1,.22,1)` used across reveals, hovers and the clipped-line
  hero intro for a slow, weightless settle; a continuous per-star twinkle and slow celestial drift in the field;
  a reticle that eases toward the cursor and runs a plate-solve scan ring on each fresh lock.
- **Why they fit:** astronomy is awe *and* arcseconds. The identity keeps the drama (deep black, aurora
  colour, a serif that feels written by candlelight) honest by anchoring every claim to real, mono-set numbers.

## Stack

- **Plain HTML / CSS / vanilla ES module.** No framework, no bundler, no build step.
- **[three.js 0.160](https://threejs.org/)** (CDN via `<script type="importmap">`), **dynamic-imported** with
  `import('three')` inside a `try/catch` — the one heavy dependency, and isolated so a CDN failure only costs
  the background, never the rest of the page.
- **Canvas 2D** for the interactive sky console (reticle, object glows, plate-solve scan).
- **SVG** (`feTurbulence` + layered radial gradients) for every procedural deep-sky render — no photographs.
- Chosen because the signature effect is a GPU particle system and everything else is cheap DOM + 2D canvas;
  a framework would add weight to a page that is essentially two canvases and some typography.

## Running it locally

No install and nothing to build — every path is relative, so any static server works:

```bash
git clone https://github.com/bswxyz/perigee-astro
cd perigee-astro
python3 -m http.server 8000      # or: npx serve .
# open http://localhost:8000
```

Edit `index.html` / `styles.css` / `main.js` and refresh. (Open via a server, not `file://`, so the
ES-module import map for three.js resolves.)

## Structure

```
index.html          the page (semantic sections; .js gate + <noscript> fallbacks for progressive enhancement)
styles.css          all styling — design tokens live in :root at the very top
main.js             ES module: starfield, sky console, astronomy math, nodes, observations, counters, form
guide/index.html    the "how it was built" write-up (self-contained, styled to match)
.nojekyll           tells GitHub Pages to serve files as-is
LICENSE             MIT
```

Design tokens: `styles.css` `:root`. The signature starfield (geometry, shaders, parallax) lives at the
bottom of `main.js`; the catalogue (`CAT`), procedural SVG renders (`makeSky`) and the horizontal-coordinate
math (`localSiderealHours`, `altAz`) are near the top.

## Demo vs. real — what a production version would need

This is an intentionally-scoped demo. What's **mocked / static** today:

- **No real telescope network.** Nodes, statuses and pointings are hand-authored data, not live mounts. A
  production build needs device control (INDI/ASCOM Alpaca), a scheduler, and a realtime channel (WebSocket)
  publishing each mount's pointing and status.
- **No plate-solving.** The console *simulates* lock by proximity to catalogued positions. Real focus = an
  actual astrometric solve (e.g. astrometry.net / ASTAP) against a star index, then a mount-correction loop.
- **No live imagery.** Every nebula/galaxy/cluster is procedural SVG. A real product would stream and stack
  frames from cameras, with calibration (darks/flats) and integration on a server.
- **The Alt/Az *is* real math** (LST + horizontal transform) but for a single representative site; production
  would compute per-node from each mount's true lat/long, refraction and time.
- **No accounts, invites, queueing, storage or payments.** "Request a node" logs nothing — it's a demo form.

What's **real and reusable as-is:** the WebGL starfield (geometry, twinkle/parallax shaders, DPR cap,
visibility pausing, disposal), the interactive reticle console, the sidereal/Alt-Az computation, the
procedural deep-sky render system, and the full responsive / reduced-motion / keyboard-accessible layer.

## License

[MIT](LICENSE). Design & build by **Fable** (Anthropic's Claude). All visuals are procedural — no
photographs or third-party imagery.
