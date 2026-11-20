/* Explore Beyond — the final page (phase I).
   [animation: blackhole] Name column over the black hole, built from
   data/projects.js (FINAL_*). Also owns the EATEN counter label that
   the black hole module feeds as particles cross the horizon. The
   run page includes all of these elements; a page that omits them
   leaves this module idle (null-guarded). */
import { M } from '../../shared/math.js';
import { data as D } from '../../data/projects.js';

var finalEl, finalInner, finalTagEl, finalNameEl, finalSubEl, finalMetaEl, finalBtnsEl, eatenEl;
var ready = false;
var last = { finalVis: -1, finalO: -1, finalPe: '' };

function setStyle(el, prop, val) { el.style[prop] = val; }

function init(ctx) {
  finalEl = document.getElementById('final');
  finalInner = document.getElementById('final-inner');
  finalTagEl = document.getElementById('final-tag-text');
  finalNameEl = document.getElementById('final-name');
  finalSubEl = document.getElementById('final-sub');
  finalMetaEl = document.getElementById('final-meta');
  finalBtnsEl = document.getElementById('final-btns');
  eatenEl = document.getElementById('eaten');
  ready = !!(finalEl && finalInner && finalTagEl && finalNameEl && finalSubEl && finalBtnsEl && eatenEl);
  if (!ready) return;

  (function buildFinal() {
    finalTagEl.textContent = D.FINAL_TAG;
    finalNameEl.textContent = D.FINAL_NAME;
    finalSubEl.textContent = D.FINAL_SUB;
    if (finalMetaEl) finalMetaEl.textContent = D.FINAL_META || '';
    for (var i = 0; i < D.FINAL_LINKS.length; i++) {
      var pr = D.FINAL_LINKS[i];
      var a = document.createElement('a');
      a.className = 'fbtn';
      a.href = pr.href;
      a.textContent = pr.label;
      if (pr.scrollTo != null) {
        (function (p) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
            window.scrollTo({ top: p * max, behavior: 'smooth' });
          });
        })(pr.scrollTo);
      } else if (pr.href === '#') {
        a.addEventListener('click', function (e) { e.preventDefault(); });
      } else if (pr.href.slice(-4) === '.pdf') {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      finalBtnsEl.appendChild(a);
    }
  })();
}

function setEaten(text) {
  if (eatenEl) eatenEl.textContent = text;
}

function update(ctx) {
  if (!ready) return;
  var p = ctx.p;

  /* final page (phase I) */
  var fShow = p > 0.945;
  if (fShow !== (last.finalVis === 1)) {
    last.finalVis = fShow ? 1 : 0;
    setStyle(finalEl, 'visibility', fShow ? 'visible' : 'hidden');
    setStyle(eatenEl, 'visibility', fShow ? 'visible' : 'hidden');
  }
  var fk = M.phase(0.95, 0.98, p);
  if (Math.abs(fk - last.finalO) > 0.004) {
    last.finalO = fk;
    setStyle(finalInner, 'opacity', fk.toFixed(3));
    setStyle(finalInner, 'transform', 'scale(' + (0.9 + 0.1 * fk).toFixed(3) + ')');
    setStyle(eatenEl, 'opacity', fk.toFixed(3));
  }
  var fPe = p > 0.97 ? 'auto' : 'none';
  if (fPe !== last.finalPe) {
    last.finalPe = fPe;
    finalBtnsEl.style.pointerEvents = fPe;
  }
}

const final = { init: init, update: update, setEaten: setEaten };

export default final;
