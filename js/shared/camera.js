/* Explore Beyond — the camera (all phases).
   Story-driven position / look / roll / fov for A-H (station dolly,
   planet focus, explosion shake, the parked-card hold, the snap to
   the star), and the interactive orbit camera for the black hole
   page (I): drag to orbit, wheel-down zooms in only when the page
   can't scroll further, pinch zooms on touch. The camera aims at a
   pivot slightly off-center so the hole sits clear of the name
   column.
   Every story position is a pure function of p, which is what lets
   the standalone animation runs scrub the exact same camera through
   their ranges. */
import { M } from './math.js';
import { config as C } from '../config.js';

var camera, dFinal, lastFov = 50;
var lookTmp;

/* ---- interactive orbit state (phase I) ---- */
var bhPivotX = 0, bhPivotY = 0;
var orbit = { theta: 0.55, phi: 1.32, radius: 330, tTheta: 0.55, tPhi: 1.32, tRadius: 330 };
var dragging = false, lastPX = 0, lastPY = 0;
var pinchD = -1;

// Final camera distance of phase C: d = R / sin(fov/2 * 0.8) -> planet fills ~80% of viewport height.
function heroDistance(ctx) {
  return (5 / Math.sin((25 * Math.PI / 180) * 0.8)) * (ctx.isMobile ? 1.15 : 1.0);
}

function resetOrbit(ctx) {
  bhPivotX = 0;                    // hole dead center
  bhPivotY = ctx.isMobile ? 70 : 0;    // mobile: text on top, hole in the lower half
  orbit.radius = orbit.tRadius = ctx.isMobile ? 1250 : 1000;
  orbit.phi = orbit.tPhi = ctx.isMobile ? 1.22 : 1.32;
  orbit.theta = orbit.tTheta = ctx.isMobile ? 0.35 : 0.55;
}

function stepOrbit(dt, p) {
  if (!dragging && p > 0.95) orbit.tTheta += 0.05 * dt; // idle camera drift
  var f = Math.min(1, 7 * dt);
  orbit.theta += (orbit.tTheta - orbit.theta) * f;
  orbit.phi += (orbit.tPhi - orbit.phi) * f;
  orbit.radius += (orbit.tRadius - orbit.radius) * f;
}

function init(ctx) {
  camera = ctx.camera;
  dFinal = heroDistance(ctx);
  lastFov = camera.fov;
  lookTmp = new THREE.Vector3();
  resetOrbit(ctx);

  window.addEventListener('pointerdown', function (e) {
    if (ctx.p < 0.95) return;
    if (e.target.closest && (e.target.closest('#final-btns') || e.target.closest('#card'))) return;
    dragging = true;
    lastPX = e.clientX;
    lastPY = e.clientY;
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragging || ctx.p < 0.95) return;
    var dx = e.clientX - lastPX, dy = e.clientY - lastPY;
    lastPX = e.clientX;
    lastPY = e.clientY;
    // on touch: sideways swipes orbit, vertical swipes keep scrolling the page
    if (ctx.isMobile && Math.abs(dx) < Math.abs(dy)) return;
    orbit.tTheta -= dx * 0.005;
    orbit.tPhi = M.clamp(orbit.tPhi - dy * 0.005, 0.15, Math.PI - 0.15);
  }, { passive: true });

  window.addEventListener('pointerup', function () { dragging = false; });
  window.addEventListener('pointercancel', function () { dragging = false; });

  window.addEventListener('wheel', function (e) {
    if (ctx.p < 0.95 || e.deltaY <= 0) return;
    var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    if (window.scrollY < max - 2) return; // page can still scroll down: let it
    e.preventDefault();
    orbit.tRadius = M.clamp(orbit.tRadius * (1 + e.deltaY * 0.0012), 250, 2200);
  }, { passive: false });

  window.addEventListener('touchstart', function (e) {
    pinchD = (e.touches.length === 2 && ctx.p >= 0.95)
      ? Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      : -1;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (pinchD < 0 || e.touches.length !== 2) return;
    var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (d > 0) {
      orbit.tRadius = M.clamp(orbit.tRadius * pinchD / d, 250, 2200);
      pinchD = d;
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('touchend', function () { pinchD = -1; }, { passive: true });
}

// the hero framing distance is viewport-class dependent
function refreshDistance(ctx) {
  dFinal = heroDistance(ctx);
}

// mobile <-> desktop switch: reframe the planet AND reset the orbit pose
function onViewportChange(ctx) {
  dFinal = heroDistance(ctx);
  resetOrbit(ctx);
}

function update(ctx) {
  var p = ctx.p, t = ctx.t;

  /* camera z (continuous at every boundary) */
  var camZ;
  if (p < 0.06) camZ = 3;
  else if (p < 0.16) camZ = 3 - 15 * M.easeInOut(M.phase(0.06, 0.16, p));
  else if (p < 0.40) camZ = -12 + (dFinal + 12) * M.easeInOut(M.phase(0.16, 0.40, p));
  else if (p < 0.535) camZ = dFinal;
  else if (p < 0.90) camZ = dFinal - C.DRIFT * (p - 0.535);
  else if (p < 0.91) camZ = M.lerp(dFinal - C.DRIFT * (0.90 - 0.535), -70, M.easeIn(M.phase(0.90, 0.91, p)));
  else camZ = ctx.isMobile ? 23.5 : 15.3; // black hole page pose

  var camX = 0, camY = 0;
  var idle = 0.04 * (1 - M.phase(0.02, 0.08, p));
  camX += Math.sin(t * 0.5) * idle;
  camY += Math.cos(t * 0.4) * idle * 0.7;
  var spinShake = 0.15 * ctx.spin * (1 - M.phase(0.535, 0.55, p));
  camX += Math.sin(t * 41.0) * spinShake;
  camY += Math.cos(t * 37.0) * spinShake * 0.8;
  var swayAmt = M.phase(0.56, 0.60, p) * (1 - M.phase(0.88, 0.90, p));
  // the camera holds perfectly still across each card's whole window —
  // the entry must be a straight shot (no sway on arrival) and the
  // parked card must not drift around on screen. It sways only in the
  // gaps between the cards, while the stream flows by. Card 1's hold
  // starts at the blast hand-off: the whole cinematic is a controlled
  // shot (the detonation shake at 0.53-0.55 is separate and still plays)
  for (var swi = 0; swi < C.WIN.length; swi++) {
    var swLock = (swi === 0)
      ? M.phase(C.EXPLODE_AT - 0.004, C.EXPLODE_AT + 0.004, p)
      : M.phase(C.WIN[swi].in - 0.008, C.WIN[swi].in + 0.004, p);
    swLock *= (1 - M.phase(C.WIN[swi].out - 0.006, C.WIN[swi].out + 0.012, p));
    swayAmt *= 1 - swLock;
  }
  camX += Math.sin(t * 0.31) * 0.5 * swayAmt;
  camY += Math.cos(t * 0.23) * 0.35 * swayAmt;
  if (p >= 0.88 && p < 0.91) {
    var gsh = 0.05 + 0.5 * M.phase(0.88, 0.91, p);
    camX += Math.sin(t * 29.0) * gsh * 0.5;
    camY += Math.cos(t * 23.0) * gsh * 0.4;
  }

  if (p < 0.91) {
    camera.position.set(camX, camY, camZ);
  } else {
    // interactive orbit camera around the black hole (flash covers the snap)
    stepOrbit(ctx.dt, p);
    var bsp = Math.sin(orbit.phi), bcp = Math.cos(orbit.phi);
    camera.position.set(
      bhPivotX + orbit.radius * bsp * Math.sin(orbit.theta),
      bhPivotY + orbit.radius * bcp,
      orbit.radius * bsp * Math.cos(orbit.theta)
    );
  }

  /* fov: 50 -> 55 across F, reset to 50 at the black hole */
  var fovV = 50;
  if (p >= 0.56 && p < 0.90) fovV = 50 + 5 * M.phase(0.56, 0.90, p);
  else if (p >= 0.90 && p < 0.91) fovV = 55;
  if (Math.abs(fovV - lastFov) > 0.01) {
    lastFov = fovV;
    camera.fov = fovV;
    camera.updateProjectionMatrix();
  }

  /* look target: corridor axis -> planet -> origin -> star -> hole */
  var planetZ = (p < 0.16) ? -40 : M.lerp(-40, 0, M.easeInOut(M.phase(0.16, 0.40, p)));
  if (p < 0.16) lookTmp.set(0, 0, M.lerp(-20, -40, M.phase(0.06, 0.16, p)));
  else if (p < 0.40) lookTmp.set(0, 0, planetZ);
  else if (p < 0.90) lookTmp.set(0, 0, 0);
  else if (p < 0.91) lookTmp.set(0, 0, M.lerp(0, -120, M.phase(0.90, 0.91, p)));
  else lookTmp.set(bhPivotX, bhPivotY, 0);
  camera.lookAt(lookTmp);

  var roll = 0.04 * M.phase(0.08, 0.13, p) * (1 - M.phase(0.15, 0.20, p));
  if (roll > 0) camera.rotateZ(roll);

  /* shared with the phase modules (they place things relative to the
     camera, so this runs first in the frame) */
  ctx.camZ = camZ;
  ctx.camX = camX;
  ctx.camY = camY;
  ctx.planetZ = planetZ;
}

const cameraModule = {
  init: init,
  update: update,
  refreshDistance: refreshDistance,
  onViewportChange: onViewportChange,
  get dragging() { return dragging; }
};

export default cameraModule;
