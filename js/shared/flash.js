/* Explore Beyond — the shared white-flash sink.
   The #flash overlay is ONE element driven by two beats that live in
   different animation folders (the detonation ping in animations/blast,
   the nova -> hole ramp in animations/blackhole). Each beat adds its
   value once per frame; commit() writes the max to the DOM exactly once
   (called from the stage's frame-end render), so the beats can never
   overwrite each other. Tolerates a missing element: standalone pages
   that include no beat simply never light the flash. */

var el = null;
var values = [];
var last = -1;

function init() {
  el = document.getElementById('flash');
}

function add(v) {
  values.push(v);
}

function commit() {
  var m = 0;
  for (var i = 0; i < values.length; i++) if (values[i] > m) m = values[i];
  values.length = 0;
  if (!el) return;
  if (Math.abs(m - last) > 0.004) {
    last = m;
    el.style.opacity = m.toFixed(3);
  }
}

export const flashSink = { init: init, add: add, commit: commit };
