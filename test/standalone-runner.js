/* Child harness for test/standalone.js: boots ONE animation folder's
   run.js headlessly (the same modules the browser page loads),
   scrubs its story range with the shared range scrubber, and asserts
   the key beats of that animation. Run under the parent:
     node test/standalone-runner.js <zoom|blast|shards|blackhole> */
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { setup } = require('./stubs.js');

const NAME = process.argv[2];
if (!['zoom', 'blast', 'shards', 'blackhole'].includes(NAME)) {
  console.error('unknown animation: ' + NAME);
  process.exit(2);
}

const S = setup();
const elements = S.elements;
const ROOT = path.resolve(__dirname, '..');
const url = (f) => pathToFileURL(path.join(ROOT, f)).href;

let failures = 0;
function check(label, cond) {
  if (cond) console.log('ok  ' + label);
  else { console.error('FAIL ' + label); failures++; }
}

async function main() {
  const config = (await import(url('js/config.js'))).config;
  const entryUrl = 'js/animations/' + NAME + '/index.js';
  const animEntry = NAME === 'shards'
    ? (await import(url(entryUrl))).default
    : null;

  await import(url('js/animations/' + NAME + '/run.js'));
  const run = window.__run;
  if (!run) {
    console.error('FAIL run.js did not boot (window.__run missing)');
    process.exit(1);
  }
  const ctx = run.ctx;
  const [from, to] = config.RANGES[NAME];

  function pump(n) {
    for (let i = 0; i < n; i++) {
      if (!window.__raf) break;
      const cb = window.__raf;
      window.__raf = null;
      cb();
    }
  }

  // scroll fraction -> story p; pump until the scrubber settles there
  function stepTo(frac, maxFrames) {
    const expected = from + (to - from) * frac;
    window.scrollY = frac * S.maxScroll;
    S.fireScroll();
    let guard = 0;
    while (guard++ < (maxFrames || 800) && window.__raf) {
      const cb = window.__raf;
      window.__raf = null;
      cb();
      if (Math.abs(ctx.p - expected) < 0.0005) break;
    }
    return ctx.p;
  }

  /* ------------------------------------------------ the scripts */
  if (NAME === 'zoom') {
    pump(10);
    check('zoom: boots at the start of the range (p=0)', Math.abs(ctx.p - 0) < 0.001);
    check('zoom: hero visible at the start', parseFloat(elements.hero.style.opacity || '1') > 0.75);
    check('zoom: camera starts inside the corridor (camZ=3)', Math.abs(ctx.camZ - 3) < 0.001);
    stepTo(0.5, 600);
    check('zoom: scrubs to the middle (p=0.20)', Math.abs(ctx.p - 0.20) < 0.002);
    check('zoom: camera leaving the corridor', ctx.camZ < -5);
    stepTo(1.0, 600);
    const dFinal = 5 / Math.sin(25 * Math.PI / 180 * 0.8);
    check('zoom: ends at full planet focus (p=0.40)', Math.abs(ctx.p - 0.40) < 0.002);
    check('zoom: camera at the hero distance', Math.abs(ctx.camZ - dFinal) < 0.05);
  } else if (NAME === 'blast') {
    pump(10);
    check('blast: boots at the start of the range (p=0.40)', Math.abs(ctx.p - 0.40) < 0.001);
    check('blast: no spin-up yet (spin=0)', Math.abs(ctx.spin) < 0.001);
    stepTo((0.48 - 0.40) / (0.585 - 0.40), 600);
    check('blast: spin-up in progress (spin>0.5)', ctx.spin > 0.5);
    stepTo((0.535 - 0.40) / (0.585 - 0.40), 800);
    const flashAtBlast = parseFloat(elements.flash.style.opacity || '0');
    check('blast: flash ping fires at the detonation (p=0.535)', flashAtBlast > 0.9);
    stepTo(1.0, 800);
    check('blast: ends at p=0.585 (card 1 is born right after)', Math.abs(ctx.p - 0.585) < 0.002);
    check('blast: explosion complete (ex=1)', Math.abs(ctx.ex - 1) < 0.001);
    check('blast: flash faded by the end', parseFloat(elements.flash.style.opacity || '1') < 0.05);
  } else if (NAME === 'shards') {
    pump(10);
    check('shards: boots at the start of the range (p=0.585)', Math.abs(ctx.p - 0.585) < 0.001);

    // the park walk: the gate holds at every park, one card at a time.
    // It goes FORWARD from the boot (p == P1's in, the range floor): a
    // released gate stays disarmed until the story drops back below its
    // `in`, and P1's in IS the floor, so a card can't be re-latched by
    // aiming at it from above. Card 1 latches from the boot position;
    // cards 2-6 are aimed 0.03 PAST their park, because releasing a
    // hold needs the destination to lead the hold target by more than
    // the hold eps — aiming at the park exactly would leave
    // target == holdTarget and the hold could never release.
    for (let i = 0; i < config.WIN.length; i++) {
      const w = config.WIN[i];
      const aim = (i === 0) ? w.park : w.park + 0.03;
      stepTo((aim - from) / (to - from), 400);
      pump(30);  // let the INBOUND -> HELD snap land (the stepTo break
                 // can fire one frame before it: break eps == reach eps)
      const mesh = animEntry.stream.projectMeshes[i];
      check('shards: card ' + (i + 1) + ' parked at its park (p=' + ctx.p.toFixed(3) + ')',
        ctx.parked && Math.abs(ctx.p - w.park) < 0.002 &&
        ctx.p >= w.park && ctx.p < w.out && mesh.visible);
    }
    stepTo(1.0, 600);
    check('shards: band is over at p=0.89 (no card left)',
      animEntry.stream.projectMeshes.every((m) => !m.visible));

    // sweep the whole band: the hand-off rule + card order. The walk
    // released every gate; the run back down to the floor re-disarms
    // them (progress back below each `in`), so the sweep replays the
    // band with the full latch/hold/release cycle
    let worst = 0, sawGap = false;
    const seen = [];
    for (let f = 0; f <= 1.0001; f += 0.01) {
      stepTo(f, 500);
      const meshes = animEntry.stream.projectMeshes;
      const vis = meshes.filter((m) => m.visible).length;
      worst = Math.max(worst, vis);
      if (vis === 0) sawGap = true;
      const which = meshes.findIndex((m) => m.visible);
      if (which >= 0) seen.push(which);
    }
    check('shards: at most one card at a time (max=' + worst + ')', worst <= 1);
    check('shards: there are gaps between cards', sawGap);
    const firstSeen = config.WIN.map((w, i) => seen.indexOf(i));
    check('shards: cards appear in order P1 -> P2 -> ... -> P' + config.WIN.length,
      firstSeen.every((v) => v >= 0) &&
      firstSeen.every((v, i) => i === 0 || v > firstSeen[i - 1]));
  } else if (NAME === 'blackhole') {
    pump(10);
    check('blackhole: boots at the start of the range (p=0.875)', Math.abs(ctx.p - 0.875) < 0.001);
    for (let f = 0.2; f <= 1.0001; f += 0.2) stepTo(f, 800);
    check('blackhole: reaches the orbit page (p=1.0)', Math.abs(ctx.p - 1.0) < 0.001);
    {
      const pos = ctx.camera.position;
      const dist = Math.hypot(pos.x, pos.y, pos.z);
      check('blackhole: camera settled in the orbit pose (r~1000)', dist > 900 && dist < 1100);
    }
    // let the live world run (particle sim + eaten counter)
    pump(1200);
    check('blackhole: flash faded after the snap', parseFloat(elements.flash.style.opacity || '1') < 0.05);
    check('blackhole: final page visible', elements.final.style.visibility === 'visible');
    check('blackhole: final name from data', elements['final-name'].textContent === 'Deepak Sharma');
    check('blackhole: final buttons built from data (4)', elements['final-btns'].children.length === 4);
    check('blackhole: final buttons clickable', elements['final-btns'].style.pointerEvents === 'auto');
    check('blackhole: eaten counter formatted', /^EATEN \d{6}$/.test(elements.eaten.textContent));
    check('blackhole: particles are being eaten (' + elements.eaten.textContent + ')',
      parseInt(elements.eaten.textContent.slice(7), 10) > 0);
  }

  console.log(failures === 0
    ? '\n' + NAME + ': all standalone checks passed.'
    : '\n' + NAME + ': ' + failures + ' check(s) FAILED.');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\n' + NAME + ' standalone run crashed:', err);
  process.exit(1);
});
