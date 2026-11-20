# Animation 4 — the black hole (phases G-I, story range 0.875-1.00)

The second supernova blooms where the last project flew off: the nova
star, a second fireball, a long white flash — and the view snaps to
the black hole. The finale is real GR: an accretion disk of ~60,000
particles on Newtonian orbits, photon geodesics traced per pixel
(RK4 on the Binet equation), the far side of the disk wrapped over
the shadow, an EATEN counter for every particle that crosses the
horizon — and the final name page over it all.

## Run it standalone

Serve the project root (ES modules need HTTP, same as the main page):

```sh
python3 -m http.server 8080   # from the project root
# -> http://localhost:8080/js/animations/blackhole/run.html
```

Scroll the page to scrub the transition; at the bottom the run ends
**live** on the orbit page — drag to orbit, wheel-down zooms in once
the page can't scroll further, pinch on touch (exactly like the main
page). The scrub length is one attribute in `run.html`
(`#scroll-space` height).

## Files

| file | what it does |
|---|---|
| `index.js` | the animation entry: `{ name, range, init, update, resize, render }`; wires the hole's `onEaten` to the final page |
| `star.js` | the nova star at z=-120, blooming as project 3 flies off (G) |
| `nova.js` | the nova fireball — reuses the blast's `makeFireballSystem` (same seed, same burst) |
| `flash.js` | the second flash beat: ramp up through the snap, fade by 0.94 (feeds the shared sink) |
| `hole.js` | the black hole world: particle disk on Newtonian orbits, infall swirls, the lensable starfield + nebulae, the EATEN counter |
| `lens.js` | the geodesic lens pass (per-pixel photon bending, reduced-res RT, blit into the dither RT) |
| `final.js` | the final name page + the EATEN label, built from `data/projects.js` |
| `run.html` / `run.js` | the standalone scrub page + its driver |

`render(ctx)` is the extra piece of the entry contract: from
p >= 0.91 the stage calls it instead of rendering the story scene
(the lensed world owns the screen).

## Dependencies (imported, not copied)

- `shared/` — stage, story camera, timeline math, stars, dither, flash sink, utils
- `../blast/fireball.js` — the shared fireball system (the nova reuses
  the same 6000-particle burst)
