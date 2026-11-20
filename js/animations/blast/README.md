# Animation 2 — the blast (phases D-E, story range 0.40-0.585)

The moon spins up under a growing core glow, an orange crack web opens
across its surface, the camera shakes — and it detonates: white flash
ping, 6000-particle fireball, expanding shockwave. It is gone before
the first project card is born.

## Run it standalone

Serve the project root (ES modules need HTTP, same as the main page):

```sh
python3 -m http.server 8080   # from the project root
# -> http://localhost:8080/js/animations/blast/run.html
```

Scroll the page to scrub the animation; scroll back to reverse it. The
scrub length is one attribute in `run.html` (`#scroll-space` height).

## Files

| file | what it does |
|---|---|
| `index.js` | the animation entry: `{ name, range, init, update, resize }` |
| `planet.js` | the moon: procedural cratered surface + emissive crack-web heat shader (A-D) |
| `coreglow.js` | white-orange glow blooming behind the planet while it spins up (D) |
| `fireball.js` | the GPU fireball system (geometry + shaders, exported as `makeFireballSystem`) + the planet fireball (E) |
| `shockwave.js` | the expanding blast ring (E) |
| `flash.js` | the detonation ping, first beat of the shared flash (E) |
| `run.html` / `run.js` | the standalone scrub page + its driver |

## Dependencies (imported, not copied)

- `shared/` — stage, story camera, timeline math, stars, dither, flash sink, utils
- `../blackhole/nova.js` imports `makeFireballSystem` from this folder's
  `fireball.js` (the second supernova reuses the same burst)
