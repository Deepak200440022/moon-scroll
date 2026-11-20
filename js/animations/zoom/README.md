# Animation 1 — the zoom (phases A-C, story range 0.00-0.40)

You start inside a space station, looking out through the glass. The
camera dollies out of the corridor, past the porthole, and frames the
planet until it fills the view — the moment the story hands off to the
blast.

## Run it standalone

Serve the project root (ES modules need HTTP, same as the main page):

```sh
python3 -m http.server 8080   # from the project root
# -> http://localhost:8080/js/animations/zoom/run.html
```

Scroll the page to scrub the animation; scroll back to reverse it. The
scrub length is one attribute in `run.html` (`#scroll-space` height).

## Files

| file | what it does |
|---|---|
| `index.js` | the animation entry: `{ name, range, init, update, resize }` — what the main page and the run import |
| `station.js` | corridor + porthole you start inside (A-B) |
| `panels.js` | hero title, corner caption, scroll hint, progress bar (A-B) |
| `run.html` / `run.js` | the standalone scrub page + its driver |

## Dependencies (imported, not copied)

- `shared/` — stage, story camera, timeline math, stars, dither, utils
- `../blast/planet.js` — the moon itself (owned by the blast animation;
  the zoom only frames it)
