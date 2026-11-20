/* Explore Beyond — overlay text panels + HUD (phases A-B).
   [animation: zoom] The hero title, the corner caption, the scroll
   hint and the top progress bar. The hero/corner/hint fade out as the
   zoom begins; the progress bar keeps tracking p across the whole
   story (on the main page). A standalone page may omit any of the
   elements it doesn't include — the module then stays idle. */
import { M } from '../../shared/math.js';

var progressBar, heroEl, cornerEl, hintEl;
var ready = false;
var last = { heroO: -1, heroT: -1, cornerO: -1, hintO: -1, barW: -1 };

function setStyle(el, prop, val) { el.style[prop] = val; }

function init(ctx) {
  progressBar = document.getElementById('progress');
  heroEl = document.getElementById('hero');
  cornerEl = document.getElementById('corner');
  hintEl = document.getElementById('hint');
  ready = !!(progressBar && heroEl && cornerEl && hintEl);
}

function update(ctx) {
  if (!ready) return;
  var p = ctx.p;

  var heroO = 1 - M.phase(0.02, 0.06, p);
  if (Math.abs(heroO - last.heroO) > 0.004) {
    last.heroO = heroO;
    setStyle(heroEl, 'opacity', heroO.toFixed(3));
  }
  var heroT = -30 * M.phase(0.02, 0.06, p);
  if (Math.abs(heroT - last.heroT) > 0.15) {
    last.heroT = heroT;
    setStyle(heroEl, 'transform', 'translateY(' + heroT.toFixed(1) + 'px)');
  }

  var cornerO = 1 - M.phase(0.02, 0.06, p);
  if (Math.abs(cornerO - last.cornerO) > 0.004) {
    last.cornerO = cornerO;
    setStyle(cornerEl, 'opacity', cornerO.toFixed(3));
  }

  var hintO = 1 - M.phase(0.02, 0.07, p);
  if (Math.abs(hintO - last.hintO) > 0.004) {
    last.hintO = hintO;
    setStyle(hintEl, 'opacity', hintO.toFixed(3));
  }

  if (Math.abs(p - last.barW) > 0.0008) {
    last.barW = p;
    setStyle(progressBar, 'transform', 'scaleX(' + p.toFixed(4) + ')');
  }
}

const panels = { init: init, update: update };

export default panels;
