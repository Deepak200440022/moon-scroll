# Animation 3 — the shards (phase F, story range 0.585-0.89)

The exploded planet is now a stream of shards flowing past the
camera. One broken-glass project slab at a time arrives, **stops**,
and flies off — making way for the next project.

## The beats

The band plays the same three-beat sequence for every project, and
each card's park is a **mandatory stopping point**:

1. **Ambient flow** — the shard stream flies past while the user
   scrolls (beat 1; the first crossing of the blast edge plays the
   full blast cinematic on its own clock, card 1 included — it is
   never skipped, no matter how fast the user scrolled).
2. **Arrive + stop** — the card glides in and the story **holds at
   its park** (`config.WIN[n].park`): the card floats in space; its
   details stay hidden until you hover it (no auto-open). The hold
   is infinite — a resting hand never advances the story.
3. **Scroll on** — a new forward gesture (wheel-down, swipe-up,
   scroll key — raw input events, which fire even at the bottom of
   the page — or a scrollbar drag that keeps advancing) releases the
   hold: the card flies forward off-screen and the next card arrives.
   Scrolling back is always free: the story simply rewinds.

The state machine is `shared/parkgate.js` (flow → inbound → held),
shared by the main page's driver (`story/scroll.js`) and this
folder's standalone scrubber (`shared/rangescroll.js` with `opts.win`).
The latch keys off the forward lead — the destination ahead of the
story while it crosses a card's arrival window — so it commits the
stop at any scroll speed (fast flicks and reading pace alike); no
card is ever skipped. Tunables live in `config.js`: `PARK_ARRIVE_K`
(how fast a latched story converges onto the park) and `PARK_MARGIN`
(how far past a park the destination must lie for the blast
cinematic's arrival drift to fast-forward).

## Run it standalone

Serve the project root (ES modules need HTTP, same as the main page):

```sh
python3 -m http.server 8080   # from the project root
# -> http://localhost:8080/js/animations/shards/run.html
```

Scroll the page to scrub the animation; scroll back to reverse it.
The stopping points apply here too — a fast scrub lands on card 1's
park and holds until you scroll on again. Hover a slab to open its
card; click it to pin. The scrub
length is one attribute in `run.html` (`#scroll-space` height).

## Performance notes

- The 600 ambient rocks (300 on mobile, `SHARD_COUNT_MOBILE`) run
  their per-instance matrix loop only when one of their inputs
  `(t, p, camZ, ex, pop, pull, flowZ)` changed — while a card is
  parked the whole loop and the `instanceMatrix` upload are skipped
  (the parked card's idle float keeps breathing on `ctx.rawDt`).
- The card's raycast runs at most once per frame (`pointermove` only
  records the pointer).
- The stage's adaptive pixel-ratio governor (`shared/stage.js` +
  `shared/pixratio.js`) steps the renderer's ratio 2 → 1.5 → 1.25 on
  sustained slow frames and back when they are fast; point-sprite
  consumers (dust, fireballs, black hole lens) keep their `uPixel`
  in sync through the ratio's listener list.

## Files

| file | what it does |
|---|---|
| `index.js` | the animation entry: `{ name, range, init, update, resize }` + `card` / `stream` handles; wires card <-> shard stream (no circular import) |
| `shards.js` | the shard stream: ambient rocks (loop skipped while parked) + one project slab per project across `config.WIN`, in three beats: `arrivePose` / `parkPose` / `flyOffPose` |
| `dust.js` | fine particles drifting with the flow (all motion in the vertex shader) |
| `card.js` | the info card: hover / pin (hover-only, even while parked); tracks the active shard on screen |
| `run.html` / `run.js` | the standalone scrub page + its driver (range scrubber with the same park gate, `ctx.parked` freeze) |

## Dependencies (imported, not copied)

- `shared/` — stage, story camera, timeline math, stars, dither,
  pixratio, the park gate, utils
- `../blast/planet.js` + `../blast/fireball.js` — the moon and the
  blast's fireball: both are still alive at the very start of this
  range (the fireball lingers until p=0.70), so the run imports them
  for a faithful start
