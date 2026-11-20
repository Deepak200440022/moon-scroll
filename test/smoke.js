/* Headless smoke test for the refactored story.
   Stubs three.js + DOM just enough to import js/main.js (which pulls
   the whole module graph with it), then drives the real animation
   loop through a full scroll sweep (0 -> 1) and asserts the key
   invariants:
      - no module throws across the whole timeline
      - at most one project shard is ever visible (the hand-off rule)
      - each card is visible inside its WIN segment and absent outside
      - flash peaks at the explosion, final page appears at the end
      - the stopping points: a fast jump to the bottom lands on card
        1's park (info card stays hover-only), the hold is infinite, one
        forward gesture per card walks every card's park in order to
        the finale, and scrolling back rewinds freely
   Also cross-checks that every getElementById target in the JS exists
   in a page (index.html or one of the run pages).
   Run: node test/smoke.js */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ROOT = path.resolve(__dirname, '..');

const { setup } = require('./stubs.js');
const S = setup();
const elements = S.elements;

/* ------------------------------------------------ collect every JS file (the animation tree, not the repro project) */
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'repro-agent') continue; // unrelated nested project
      if (e.name === '.venv' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const jsFiles = walk(path.join(ROOT, 'js'), []);

/* ------------------------------------------------ cross-checks against the pages */
const htmlPages = [
  path.join(ROOT, 'index.html'),
  ...jsFiles.filter((f) => f.endsWith('run.html')).map((f) => f)
];
const htmlIds = new Set();
for (const page of htmlPages) {
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/id="([^"]+)"/g)) htmlIds.add(m[1]);
}
const usedIds = new Set();
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/getElementById\('([^']+)'\)/g)) usedIds.add(m[1]);
}
const missingIds = [...usedIds].filter((id) => !htmlIds.has(id));
if (missingIds.length) {
  console.error('IDs used in JS but missing from every page:', missingIds);
  process.exit(1);
}
console.log('ok  DOM ids: all', usedIds.size, 'getElementById targets exist in a page (index.html or a run page)');

/* ------------------------------------------------ boot the story */
async function main() {
  const url = (f) => pathToFileURL(path.join(ROOT, f)).href;
  const shardsEntry = (await import(url('js/animations/shards/index.js'))).default;
  await import(url('js/main.js')); // boots the stage + the animate loop

  const config = (await import(url('js/config.js'))).config;

  function fireScroll() { S.fireScroll(); }

  function stepTo(targetP, maxFrames) {
    window.scrollY = targetP * S.maxScroll;
    fireScroll();
    let guard = 0;
    while (guard++ < (maxFrames || 800) && window.__raf) {
      const cb = window.__raf;
      window.__raf = null;
      cb();
      if (Math.abs(window.__EB.ctx.p - targetP) < 0.0004) break;
    }
    return window.__EB.ctx.p;
  }

  function visibleProjectCards() {
    // a card only renders if its group AND its own mesh are visible
    // (child meshes keep default visible=true while the group masks them)
    if (!shardsEntry.stream.groupVisible()) return 0;
    return shardsEntry.stream.projectMeshes.filter((m) => m.visible).length;
  }

  let failures = 0;
  function check(label, cond) {
    if (cond) console.log('ok  ' + label);
    else { console.error('FAIL ' + label); failures++; }
  }

  const ctx = window.__EB.ctx;

  /* fine sweep across the project band: the hand-off rule */
  let worst = 0;
  let sawGap = false;
  let sawAll = 0;
  let samples = 0;
  for (let tp = 0.55; tp <= 0.921; tp += 0.004) {
    const p = stepTo(tp);
    samples++;
    worst = Math.max(worst, visibleProjectCards());
    const inside = config.WIN.filter((w) => p > w.in + 0.003 && p < w.off - 0.003).length;
    if (inside === 0) sawGap = true;
    if (inside >= 1) sawAll++;
  }
  check('at most one project shard visible at any time (max=' + worst + ')', worst <= 1);
  check('there are beats with no card (hand-off gaps)', sawGap);
  check('cards are present across most of the band (' + sawAll + '/' + samples + ' samples)',
        sawAll / samples > 0.5);

  /* specific story beats */
  stepTo(0.03, 200);
  check('hero visible at the start', parseFloat(elements.hero.style.opacity || '1') > 0.75);
  check('progress bar tracks scroll', elements.progress.style.transform === 'scaleX(0.0300)' ||
        Math.abs(parseFloat(elements.progress.style.transform.slice(7)) - 0.03) < 0.002);

  /* the blast is a cinematic: scrolling into card 1's window (past the
     blast edge, above the latch's back gate) lets the whole blast +
     card 1's arrival play on its own, with no further input — the story
     must end parked at the card. (run fixed frames until the park
     holds: the park only exists once the cinematic has finished) */
  window.scrollY = 0.61 * S.maxScroll; fireScroll();
  {
    let guard = 0;
    while (guard++ < 1000 && window.__raf) {
      const cb = window.__raf; window.__raf = null; cb();
      if (ctx.p >= config.WIN[0].park - 0.0005 && ctx.parked) break;
    }
  }
  check('the blast plays through to the card park on its own (p=' + ctx.p.toFixed(3) + ')',
        ctx.p >= config.WIN[0].park - 0.001 && visibleProjectCards() === 1);

  /* the reverse of that hand-off: a decisive scroll back past card 1's
     birth point releases the park and the story rewinds to the
     destination — with no forward replay of the blast (progress must
     only fall) */
  stepTo(0.56, 400);
  check('decisive scroll back releases the card-1 park (p=' + ctx.p.toFixed(3) + ')',
        Math.abs(ctx.p - 0.56) < 0.004 && visibleProjectCards() === 0);

  const midPark = (i) => (config.WIN[i].park + config.WIN[i].out) / 2;
  const gap12 = (config.WIN[0].off + config.WIN[1].in) / 2;

  stepTo(midPark(0), 700);
  check('card 1 parked at its park (one visible)', visibleProjectCards() === 1);
  check('card 1 is the first project', shardsEntry.stream.projectMeshes[0].visible);

  stepTo(gap12, 400);
  check('gap between card 1 and card 2 (none visible)', visibleProjectCards() === 0);

  stepTo(midPark(1), 400);
  check('card 2 parked at its park', shardsEntry.stream.projectMeshes[1].visible);

  stepTo(midPark(2), 400);
  check('card 3 parked at its park', shardsEntry.stream.projectMeshes[2].visible);

  /* below the blast again (the stopping-point section re-plays the
     whole blast from scratch; the final page is still to come) */
  stepTo(0.5, 500);
  check('card closed when leaving the band', !elements.card.classList.contains('open'));

  /* ---- the stopping points (shared/parkgate.js) ----
     no matter how fast the user scrolled, every card's park is a
     mandatory stop: a hard flick to the bottom of the page lands on
     card 1's park (info card stays hover-only), the hold is infinite
     (a resting hand never advances the story), and each forward
     gesture — wheel-down works even at the bottom, where no scroll
     position is left — walks the story to the next card, in order */
  window.scrollY = S.maxScroll;
  fireScroll();
  {
    let guard = 0;
    while (guard++ < 3000 && window.__raf) {
      const cb = window.__raf; window.__raf = null; cb();
      if (ctx.parked && Math.abs(ctx.p - config.WIN[0].park) < 0.001) break;
    }
  }
  check('a fast jump to the bottom lands on card 1 park (p=' + ctx.p.toFixed(3) + ')',
        Math.abs(ctx.p - config.WIN[0].park) < 0.002 && visibleProjectCards() === 1 && ctx.parked);
  check('the parked card does NOT auto-open its info card (hover-only)',
        !elements.card.classList.contains('open'));

  /* the hold is infinite: no timer ever advances the story */
  { let g = 0; while (g++ < 200 && window.__raf) { const cb = window.__raf; window.__raf = null; cb(); } }
  check('the hold does not release on its own (p=' + ctx.p.toFixed(3) + ')',
        ctx.parked && Math.abs(ctx.p - config.WIN[0].park) < 0.002);

  /* one forward gesture per card. The raw wheel event is what
     releases a settled hold even at the bottom of the page, where no
     scroll position is left (the story's destination already lies
     past the next park) */
  function wheelOnlyDone(done, maxFrames) {
    S.fireWheel(120);
    let guard = 0;
    while (guard++ < (maxFrames || 800) && window.__raf) {
      const cb = window.__raf; window.__raf = null; cb();
      if (done()) break;
    }
  }
  wheelOnlyDone(() => ctx.parked && Math.abs(ctx.p - config.WIN[1].park) < 0.002);
  check('one scroll-on beat walks to card 2 park (p=' + ctx.p.toFixed(3) + ')',
        ctx.parked && Math.abs(ctx.p - config.WIN[1].park) < 0.002 && visibleProjectCards() === 1);

  /* scrolling back releases a hold and rewinds freely (no gate hold);
     the beat between card 1 (gone by WIN[0].off) and card 2 (in at
     WIN[1].in) is clear space — no card visible there */
  stepTo(gap12, 400);
  check('scrolling back releases the hold and rewinds freely (p=' + ctx.p.toFixed(3) + ')',
        Math.abs(ctx.p - gap12) < 0.004 && visibleProjectCards() === 0);

  /* forward again: wheeling away from the bottom of the page also
     advances the page scroll (as in a browser), so keep wheeling until
     the destination lies clearly past the next park — one beat per
     card, through the whole band */
  function wheelAway(storyTarget, done, maxFrames) {
    let guard = 0;
    while (guard++ < (maxFrames || 1500) && window.__raf) {
      window.scrollY = Math.min(S.maxScroll, storyTarget * S.maxScroll);
      S.fireWheel(120);
      S.fireScroll();
      const cb = window.__raf; window.__raf = null; cb();
      if (done()) break;
    }
  }
  for (let i = 1; i < config.WIN.length; i++) {
    wheelAway(config.WIN[i].park + 0.03,
              () => ctx.parked && Math.abs(ctx.p - config.WIN[i].park) < 0.002);
  }
  check('the walk reaches the last card park (p=' + ctx.p.toFixed(3) + ')',
        ctx.parked &&
        Math.abs(ctx.p - config.WIN[config.WIN.length - 1].park) < 0.002 &&
        visibleProjectCards() === 1);
  wheelAway(1.0, () => !ctx.parked && ctx.p > 0.99);
  check('the final scroll-on beat reaches the finale (p=' + ctx.p.toFixed(3) + ')',
        !ctx.parked && ctx.p > 0.99 && elements.final.style.visibility === 'visible');

  check('flash faded after the snap', parseFloat(elements.flash.style.opacity) < 0.05);
  check('final page visible at the end', elements.final.style.visibility === 'visible');
  check('final name populated from data', elements['final-name'].textContent === 'Deepak Sharma');
  check('final sub populated from data', elements['final-sub'].textContent === 'AI/ML Engineer — computer vision, deep learning & applied AI');
  check('final meta line populated from data', /Global Infoventures/.test(elements['final-meta'].textContent));
  check('final buttons built from data (4)', elements['final-btns'].children.length === 4);
  check('eaten counter formatted', /^EATEN \d{6}$/.test(elements.eaten.textContent));
  check('final buttons clickable at 0.97+', elements['final-btns'].style.pointerEvents === 'auto');

  /* backward from the finale rewinds freely into the band (no gate
     hold blocks it) — it settles in card 2's viewing zone, where the
     natural sticky park holds it */
  stepTo(midPark(1), 400);
  check('scrolling back from the finale rewinds freely (p=' + ctx.p.toFixed(3) + ')',
        ctx.p >= config.WIN[1].park - 0.002 && ctx.p < config.WIN[1].out &&
        shardsEntry.stream.projectMeshes[1].visible);

  /* and all the way back below the blast: the final page is gone and
     the info card is closed again */
  stepTo(0.5, 500);
  check('final page hidden when scrolled back', elements.final.style.visibility === 'hidden');
  check('card closed when leaving the band', !elements.card.classList.contains('open'));

  /* ---- regression: reading-pace scroll (the real user's flow) ----
     a human scrolls in notches and pauses: the destination leads the
     story by only a notch or two, never "clearly past the park".
     Every card's park must still be a stopping point, in order — the
     old latch (destination > park + PARK_MARGIN) let the story slip
     out of card 2's arrival window before the destination got far
     enough ahead, so card 2 was skipped while card 1 (the cinematic)
     and card 3 (the page bottom) still stopped. The first park stop
     per card is recorded (sampled mid-notch: a stop can begin AND
     end within one notch); they must come out P1 -> P2 -> P3 */
  stepTo(0.56, 800);
  {
    const firstStop = new Array(config.WIN.length).fill(-1);
    let visit = 0;
    let wasParked = false;
    function boundary() {
      if (ctx.parked && !wasParked) {
        visit++;
        for (let i = 0; i < config.WIN.length; i++) {
          if (firstStop[i] < 0 &&
              Math.abs(ctx.p - config.WIN[i].park) < 0.002) firstStop[i] = visit;
        }
      }
      wasParked = ctx.parked;
    }
    let targetP = 0.56;
    let notches = 0;
    while (targetP < 1.0 - 1e-9 && notches++ < 80) {
      targetP = Math.min(1.0, targetP + 0.024);   // one wheel notch
      window.scrollY = targetP * S.maxScroll;
      S.fireWheel(120);
      S.fireScroll();
      let g = 0;
      while (g++ < 300 && window.__raf) {
        const cb = window.__raf; window.__raf = null; cb();
        if (g % 10 === 0) boundary();
      }
      boundary();
    }
    const inOrder = firstStop[0] === 1 &&
      firstStop.every((v, i) => v > 0 && (i === 0 || v > firstStop[i - 1]));
    check('reading-pace scroll stops at every card park, in order (first stops: ' +
          firstStop.join(',') + ')',
          inOrder);
  }

  check('timeline values stay finite', Number.isFinite(ctx.p) && Number.isFinite(ctx.camZ) && Number.isFinite(ctx.flowZ));

  console.log(failures === 0
    ? '\nAll smoke checks passed.'
    : '\n' + failures + ' check(s) FAILED.');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nsmoke test crashed:', err);
  process.exit(1);
});
