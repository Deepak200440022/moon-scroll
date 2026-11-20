# Explore Beyond — scroll-driven portfolio

A single-page three.js story: you start inside a space station, watch a
planet spin up and detonate, fly through a shard stream where each of
your projects parks in front of you as a readable glass card, then
witness a second supernova collapse into a black hole rendered with
exact Schwarzschild photon geodesics — and land on your contact page.

Everything is a pure function of smoothed scroll progress, so scrolling
backward reverses the whole experience.

## Run it

Any static server works (ES modules need HTTP, so don't open the
`index.html` straight from disk):

```sh
python3 -m http.server 8080
# -> http://localhost:8080              the full story
# -> http://localhost:8080/js/animations/zoom/run.html        just the zoom
# -> http://localhost:8080/js/animations/blast/run.html       just the blast
# -> http://localhost:8080/js/animations/shards/run.html      just the shards
# -> http://localhost:8080/js/animations/blackhole/run.html   just the black hole
```

Needs WebGL and a network connection for the three.js CDN.

## Structure

The story is split into **four animation folders**, each a self-contained
unit: import the folder's `index.js` to run that animation, or open its
`run.html` to scrub it standalone (its own scroll bar drives exactly its
story range). `index.html` just calls the four entries in order.

```
index.html            slim shell: markup + one <script type="module"> (no logic)
css/style.css         all styles (UI, final page, responsive, reduced-motion)
js/
  main.js             thin orchestrator: builds the shared stage, runs the
                      four animation folders in story order
  config.js           the story timing sheet (all scroll boundaries in one
                      place, incl. RANGES: each folder's story range)
  data/
    projects.js       EDIT ME: projects + final page name/links
  shared/             cross-cutting modules (imported, never copied)
    stage.js          renderer/scene/camera/lights + the frame-end render
    camera.js         story dolly/look/roll/fov + interactive orbit (I)
    timeline.js       the per-frame values (spin/ex/pop/pull/flowZ)
    rangescroll.js    page scroll -> one story range (the run pages' driver)
    stars.js          background starfield (A-H)
    dither.js         1-bit Bayer dither pass (blends to color for the finale)
    flash.js          the #flash sink: two beats, one element, no races
    math.js           clamp/lerp/smoothstep/phase/eases
    random.js         seeded PRNG (identical procedural worlds every load)
    textures.js       canvas glow/nebula sprite textures
  story/              main-page-only drivers (the runs don't use these)
    scroll.js         full-page scroll -> 0..1, blast cinematic, sticky park
    nav.js            brand-bar jump links
  animations/         one folder per animation (each with a README)
    zoom/             0.00-0.40    station dolly -> planet focus
      index.js        the entry: { name, range, init, update, resize }
      station.js      corridor + porthole you start inside (A-B)
      panels.js       hero/corner/hint/progress bar (A-B)
      run.html/js     standalone scrub page + driver
    blast/            0.40-0.585   moon spin-up + detonation
      index.js        the entry
      planet.js       procedural planet + crack-web heat shader (A-D)
      coreglow.js     core glow while the planet spins up (D)
      fireball.js     the GPU fireball system (makeFireballSystem, shared
                      with the nova) + the planet fireball (E)
      shockwave.js    expanding blast ring (E)
      flash.js        detonation ping, flash beat 1 (E)
      run.html/js     standalone scrub page + driver
    shards/           0.585-0.89   the shard stream, projects one by one
      index.js        the entry (+ card/stream handles; wires card<->shards)
      shards.js       ambient rock stream + the one-by-one project cards
      dust.js         flowing dust, vertex-shader driven (F)
      card.js         project info card: hover, pin, screen tracking (F)
      run.html/js     standalone scrub page + driver
    blackhole/        0.875-1.00   nova -> black hole -> the orbit page
      index.js        the entry (+ render: the lensed finale pass)
      star.js         the nova star at z=-120 (G)
      nova.js         the nova fireball — reuses blast's fireball system (G)
      flash.js        nova -> hole ramp, flash beat 2 (G->H)
      hole.js         lensable particle world: disk, swirl, nebulae, stars (H)
      lens.js         exact geodesic raymarch + render-target blits (I)
      final.js        final name column + EATEN counter (I)
      run.html/js     standalone scrub page + driver (ends live on orbit)
```

The ranges in `config.js` overlap on purpose: the story's hand-offs
(blast embers into the shard stream, P3 flying off into the nova) live
in the overlap.

## Edit the content

All the words live in `js/data/projects.js`:

- `PROJECTS` — name / label / desc / tags / url per shard card (the label
  is what's drawn on the glass slab, the name/desc fill the info card)
- `FINAL_TAG`, `FINAL_NAME`, `FINAL_SUB`, `FINAL_LINKS` — the final page
  (`scrollTo: 0.62` on a link smooth-scrolls back to the shard flythrough)

## Tune the story

All scroll boundaries live in `js/config.js`:

- `RANGES` — the story range each animation folder owns (also the range
  its `run.html` scrubs)
- `WIN` — the per-project hand-off table (`in` / `park` / `out` / `off`
  for each card: arrival start, dead-still viewing zone, exit start, gone)
- `F_IN` / `F_OUT` — the project band
- `FLOW`, `DRIFT`, `D_READ`, `D_ENTER`, `D_PAST` — stream speed, camera
  drift, and the card's readable distance
- `#scroll-space` height (`1400vh` in `css/style.css`) sets overall
  pacing; each run page sets its own scrub length inline

## Using an animation elsewhere

Every folder exports one entry:

```js
import zoom from './js/animations/zoom/index.js';
// zoom = { name, range, init(ctx), update(ctx), resize(ctx) }
```

`ctx` is the shared per-frame context the stage builds
(`{ scene, renderer, camera, p, t, dt, rawDt, isMobile, spin, ex, pop,
pull, flowZ, camZ, ... }`). The blackhole entry also exports
`render(ctx)` — the lensed finale pass the stage swaps in from
p >= 0.91.

## Tests

Headless tests (Node, no browser needed — they stub three.js and the
DOM and drive the real frame loop):

```sh
node test/smoke.js         # the full story: timeline invariants, one card
                           # at a time, flash beats, final page, DOM id check
node test/shader-diff.js   # every GLSL string stays byte-identical to the original
node test/standalone.js    # each folder's run.js boots and scrubs its range
                           # (zoom|blast|shards|blackhole); one arg = one folder
```

## Notes

- `index.html.bak` is the pre-refactor monolith, kept for reference
  (shader-diff diffs against it).
- `window.__EB.ctx` (main page) and `window.__run.{ctx,stage}` (run
  pages) are live debug handles for the per-frame context.
- `js/phases/repro-agent/` is an unrelated project that lives here —
  leave it alone.
