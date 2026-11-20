/* Explore Beyond — the shard stream (phases E-F).
 [ animation: shards] Two *layers:
 1. ambient shards — 600 instanced low-poly rocks (300 on mobile)
 that burst out of the planet and flow past the camera. Explosion
 expansion and the +z flow are pure functions of progress; tumbles
 use clock time. The 600-matrix loop runs only when something
 actually moved — while the story is parked (t frozen, p frozen,
 camera frozen) the rocks are static and the whole loop, plus the
 instanceMatrix upload, is skipped.
 2. project shards — one broken-glass slab per project, shown strictly
 one by one across the explicit segments in config.WIN
 (blast->P1, P1->P2, P2->P3, P3->nova): the first card is born at
 the center of the explosion and glides out on a symmetric S-curve
 (it reverses cleanly when the user scrolls back); cards 2-3 then
 burst in fast and straight (no sway on the entry) to their stops
 — card 1's is the bottom-left of the view, cards 2-3 their side
 slots — where it
 floats gently in space (a slow idle drift + tilt on its own
 clock, so it keeps breathing while the story is frozen at the
 park). When the user scrolls on, the card flies forward off the
 screen, making way for the next card.
 Each card's motion is the three beats of the story, all pure
 functions of p (reverse is free):
   arrive [in,park)   fly in from the blast / deep, tumbling,
                      settling flat as it lands
   park   [park,out)  the stopping point: float gently, nothing else
                      moves (the gate holds the story here)
   flyOff [out,off)   fly forward past the camera, tumbling away
 The info card's hover state is injected by the folder entry
 (init(ctx, { getActive })) so this module never imports the card —
 the card imports this one for the mesh list. */
import { M } from '../../shared/math.js';
import { random } from '../../shared/random.js';
import { config as C } from '../../config.js';
import { data } from '../../data/projects.js';

var inst, shardGroup, shardCount;
var sDir, sZ0, sSpd, sSize, sAxis, sTSpd;

var projectShards = [];
var projectMeshes = [];

// the cards' idle float clock: always ticks (fed from ctx.rawDt in
// update) so the parked cards keep drifting gently even while the
// story clock is frozen at the park
var idleT = 0;

// the card's hover/pin index, injected by the folder entry (card.js)
var getActive = null;

// reusable temps (no allocation in the loop)
var _dummy, _q, _axis, _env;

// the last frame the ambient matrices were (re)computed; NaN keys
// force a recompute (e.g. after the instanced mesh went invisible)
var aT = NaN, aP = NaN, aCamZ = NaN, aEx = NaN, aPop = NaN;
var aPull = NaN, aFlowZ = NaN, aSizeMul = NaN;

function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

function ph(x, y, z, s) {
  var v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 53.7) * 43758.5453;
  return v - Math.floor(v);
}

/* ---- ambient rock geometry: one icosahedron, vertices hashed ---- */
function buildRockGeometry() {
  var g = new THREE.IcosahedronGeometry(1, 0);
  var pos = g.attributes.position;
  function h(x, y, z, s) {
    var v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 53.7) * 43758.5453;
    return v - Math.floor(v);
  }
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    var r = 0.7 + 0.6 * h(x, y, z, 4);
    pos.setXYZ(i,
               x * r + (h(x, y, z, 1) - 0.5) * 0.5,
               y * r + (h(x, y, z, 2) - 0.5) * 0.5,
               z * r + (h(x, y, z, 3) - 0.5) * 0.5);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/* ---- project slab geometry: a broken-glass box, flat front face ---- */
function buildShardGeometry(seedOffset) {
  var g = new THREE.BoxGeometry(3.2, 2.1, 0.25, 4, 4, 1);
  var pos = g.attributes.position;
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z > 0.1) continue; // front face stays flat
    pos.setXYZ(i,
               x + (ph(x, y, z, 1 + seedOffset) - 0.5) * 0.55,
               y + (ph(x, y, z, 2 + seedOffset) - 0.5) * 0.55,
               z + (ph(x, y, z, 3 + seedOffset) - 0.5) * 0.4);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/* ---- procedural canvas label for the slab's front face ---- */
function buildShardTexture(i) {
  var W = 512, H = 336;
  var c = document.createElement('canvas'); c.width = W; c.height = H;
  var ctx = c.getContext('2d');

  // dark glass background
  var g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop( 0, '#12161d');
  g.addColorStop(0.5, '#0b0e13');
  g.addColorStop(1, '#141922');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // subtle diagonal streaks
  var rand = random.mulberry32(555 + i * 77);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (var s = 0; s < 14; s++) {
    var x0 = rand() * W, y0 = rand() * H;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + (rand() - 0.5) * 220, y0 + (rand() - 0.5) * 220);
    ctx.stroke();
  }

  // thin white border with one chipped corner (top-right)
  var m = 16, chip = 46;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(m, m);
  ctx.lineTo(W - m - chip, m);
  ctx.lineTo(W - m - chip * 0.55, m + chip * 0.4);
  ctx.lineTo(W - m, m + chip);
  ctx.lineTo(W - m, H - m);
  ctx.lineTo(m, H - m);
  ctx.lineTo(m, m + 1);
  ctx.stroke();

  // index
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 26px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  var idx = String(i + 1);
  while (idx.length < 2) idx = '0' + idx;
  ctx.fillText(idx, m + 14, m + 12);

  // project name, fitted to the width (short label; full name lives in the card)
  var name = data.PROJECTS[i].label || data.PROJECTS[i].name;
  var fs = 44;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace';
  while (ctx.measureText(name).width > W - 2 * (m + 18) && fs > 18) {
    fs -= 2;
    ctx.font = '700 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, W / 2, H / 2 - 6);

  // first tag
  var tag = data.PROJECTS[i].tags && data.PROJECTS[i].tags.length ? data.PROJECTS[i].tags[0] : '';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '400 17px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(tag, m + 14, H - m - 14);

  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function init(ctx, opts) {
  getActive = (opts && opts.getActive) || null;
  _dummy = new THREE.Object3D();
  _q = new THREE.Quaternion();
  _axis = new THREE.Vector3();
  _env = { slotX: 0, slotY: 0, slotZ: 0, sizeMul: 1, spin: 1, camZ: 0 };

  /* ---- ambient shards (half the count on mobile) ---- */
  shardCount = ctx.isMobile ? C.SHARD_COUNT_MOBILE : C.SHARD_COUNT;
  var shardMat = new THREE.MeshStandardMaterial({ color: 0x9a9aa0, roughness: 1, metalness: 0.05, flatShading: true });
  inst = new THREE.InstancedMesh(buildRockGeometry(), shardMat, shardCount);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.frustumCulled = false;
  inst.visible = false;
  ctx.scene.add(inst);

  sDir = new Float32Array(shardCount * 3);
  sZ0 = new Float32Array(shardCount);
  sSpd = new Float32Array(shardCount);
  sSize = new Float32Array(shardCount);
  sAxis = new Float32Array(shardCount * 3);
  sTSpd = new Float32Array(shardCount);
  (function () {
    var rand = random.mulberry32(987654);
    for (var i = 0; i < shardCount; i++) {
      var u = rand() * 2 - 1;
      var ang = rand() * Math.PI * 2;
      var s = Math.sqrt(1 - u * u);
      var dx = s * Math.cos(ang), dy = u, dz = s * Math.sin(ang);
      // keep shards off the exact center line (project shards own the middle)
      if (Math.abs(dx) < 0.12) dx = (dx < 0 ? -1 : 1) * (0.12 + 0.4 * rand());
      if (Math.abs(dy) < 0.06) dy = (dy < 0 ? -1 : 1) * (0.06 + 0.3 * rand());
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      sDir[i * 3] = dx / len;
      sDir[i * 3 + 1] = dy / len;
      sDir[i * 3 + 2] = dz / len;
      sZ0[i] = -15 - 235 * rand();            // spread -250 .. -15
      sSpd[i] = 0.7 + 0.6 * rand();           // flow speed 0.7 .. 1.3
      sSize[i] = 0.15 + 0.65 * Math.pow(rand(), 1.6);
      var ax = rand() * 2 - 1, ay = rand() * 2 - 1, az = rand() * 2 - 1;
      var al = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      sAxis[i * 3] = ax / al;
      sAxis[i * 3 + 1] = ay / al;
      sAxis[i * 3 + 2] = az / al;
      sTSpd[i] = 0.5 + rand();
    }
  })();

  /* ---- project shards ---- */
  shardGroup = new THREE.Group();
  shardGroup.visible = false;
  ctx.scene.add(shardGroup);

  var placeRand = random.mulberry32(31337);
  var N = data.PROJECTS.length;
  for (var i = 0; i < N; i++) {
    var geo = buildShardGeometry(i * 7.31);
    var tex = buildShardTexture(i);
    var mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color(0xffffff),
                                             emissiveMap: tex,
                                             emissiveIntensity: 0.5,
                                             roughness: 0.55,
                                             metalness: 0.2,
                                             side: THREE.DoubleSide,
                                             transparent: true,
                                             opacity: 1
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.userData.index = i;
    var edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 8), edgeMat);
    mesh.add(edges);
    shardGroup.add(mesh);

    projectShards.push({
      mesh: mesh,
      mat: mat,
      edgeMat: edgeMat,
      x: (i % 2 === 0 ? -1 : 1) * (2.8 + 0.8 * placeRand()), // alternates left/right, 2.8..3.6
                       y: (placeRand() - 0.5) * 3.0,                            // deterministic, within ±1.5
                       tilt: (placeRand() - 0.5) * 0.3,                         // slow z tilt ±0.15
                       seed: i * 1.37 + 0.6,
                       win: C.WIN[i],                                          // its segment (see the WIN table)
      interactive: false,
      hoverF: 1,
      dimF: 1,
      // the current frame's pose, filled by the beat functions below
      px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, fade: 0, scl: 1
    });
    projectMeshes.push(mesh);
  }
}

/* ---- the three beats of a card (pure functions of p; reverse is
   free). Each fills pl.px..pl.scl; the per-frame env comes in S. ---- */

/* beat 1 — arrive: fly from the blast center / deep ahead to the
   slot, tumbling like a shard, settling flat as it lands (the S-curve
   reverses cleanly when the user scrolls back) */
function arrivePose(pl, j, p, S) {
  var w = pl.win;
  var te = smooth01((p - w.in) / (w.park - w.in));
  // j=0 is born at the explosion center; the others burst from deep ahead
  var sx0 = (j === 0) ? 0 : S.slotX * 0.15;
  var sy0 = (j === 0) ? 0 : S.slotY * 0.15;
  var sz0 = (j === 0) ? 0 : S.camZ - C.D_ENTER;
  pl.px = sx0 + (S.slotX - sx0) * te;
  pl.py = sy0 + (S.slotY - sy0) * te;
  pl.pz = sz0 + (S.slotZ - sz0) * te;
  var left = 1 - te;
  pl.rz = pl.tilt + S.spin * 1.6 * left;
  pl.rx = 0.9 * left;
  pl.ry = S.spin * 1.2 * left;
  pl.fade = Math.min(1, te * 3);
  pl.scl = 0.4 + 0.6 * te;
  pl.interactive = te > 0.92;   // hover/card only once it has arrived
}

/* beat 2 — park: the stopping point. Floats gently in space (a slow
   idle drift + tilt on the raw clock, so it keeps breathing while the
   story clock is frozen at the park) */
function parkPose(pl, S) {
  var x = S.sizeMul;
  pl.px = S.slotX + 0.14 * x * Math.sin(idleT * 0.5 + pl.seed);
  pl.py = S.slotY + 0.18 * x * Math.sin(idleT * 0.7 + pl.seed * 1.3);
  pl.pz = S.slotZ;
  pl.rz = pl.tilt + 0.04 * Math.sin(idleT * 0.4 + pl.seed);
  pl.rx = 0.04 * Math.sin(idleT * 0.33 + pl.seed * 2.1);
  pl.ry = 0.08 * Math.sin(idleT * 0.45 + pl.seed * 1.7);
  pl.fade = 1;
  pl.scl = 1;
  pl.interactive = true;
}

/* beat 3 — flyOff: the user scrolled on — the card flies forward
   past the camera, tumbling away, making way for the next one */
function flyOffPose(pl, p, S) {
  var w = pl.win;
  var tp = (p - w.out) / (w.off - w.out);
  var ee = tp * tp;                                   // ease-in, accelerates past camera
  var side = (S.slotX < 0) ? -1 : 1;
  pl.px = S.slotX + side * 3.5 * ee;
  pl.py = S.slotY;
  pl.pz = S.slotZ + (C.D_READ + C.D_PAST) * ee;
  pl.rz = pl.tilt + S.spin * 0.8 * ee;
  pl.rx = 0;
  pl.ry = S.spin * 0.6 * ee;
  pl.fade = 1 - tp * tp;
  pl.scl = 1;
  pl.interactive = tp < 0.1;
}

function update(ctx) {
  var p = ctx.p, t = ctx.t, camZ = ctx.camZ;
  var sizeMul = ctx.isMobile ? 0.8 : 1.0;
  var xMul = ctx.isMobile ? 0.5 : 1.0;
  var ex = ctx.ex, pop = ctx.pop, pull = ctx.pull, flowZ = ctx.flowZ;

  /* ambient shards — the instanced-matrix loop (and the upload) runs
     only when one of its inputs moved. While the story is parked,
     every input is frozen, so the loop is skipped entirely; the slab's
     idle float below keeps running on its own clock either way */
  inst.visible = p >= 0.52 && p < 0.91;
  if (!inst.visible) {
    aT = NaN;
  } else if (t !== aT || p !== aP || camZ !== aCamZ || ex !== aEx || pop !== aPop ||
             pull !== aPull || flowZ !== aFlowZ || sizeMul !== aSizeMul) {
    var rad = 5 * (1 + 3 * ex);
    for (var i = 0; i < shardCount; i++) {
      var i3 = i * 3;
      var sx = sDir[i3] * rad * (1 - pull);
      var sy = sDir[i3 + 1] * rad * (1 - pull);
      var sz = sDir[i3 + 2] * rad + sZ0[i] * ex + flowZ * sSpd[i];
      var cull = (sz > camZ + 2) ? 0 : 1; // behind the camera -> gone
      var sc = sSize[i] * sizeMul * pop * (1 - pull) * cull;
      _dummy.position.set(sx, sy, sz);
      _axis.set(sAxis[i3], sAxis[i3 + 1], sAxis[i3 + 2]);
      _q.setFromAxisAngle(_axis, t * sTSpd[i] * 0.15);
      _dummy.quaternion.copy(_q);
      _dummy.scale.setScalar(Math.max(sc, 0.0001));
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    aT = t; aP = p; aCamZ = camZ; aEx = ex; aPop = pop;
    aPull = pull; aFlowZ = flowZ; aSizeMul = sizeMul;
  }

  /* project shards — one by one across the explicit segments in WIN,
     one at a time: beat 1 arrive, beat 2 park (the story's stopping
     point holds here until the user scrolls on), beat 3 flyOff */
  shardGroup.visible = p >= C.F_IN && p < 0.91;
  if (shardGroup.visible) {
    var active = getActive ? getActive() : -1;

    /* the first card's stop point: the bottom-left of the user's
       view, sitting on the readable plane D_READ in front of the
       camera. Recomputed per frame because camZ drifts forward and
       the fov widens slowly through the band. */
    var tf = Math.tan((ctx.camera.fov * Math.PI / 180) * 0.5);
    var halfH = C.D_READ * tf;
    var halfW = halfH * ctx.camera.aspect;
    var stopX = Math.max(-0.72 * halfW, -(halfW - 1.7 * sizeMul));
    var stopY = Math.max(-0.50 * halfH, -(halfH - 1.2 * sizeMul));

    // the cards' idle float: a slow, tiny drift + tilt (always ticks,
    // even while the story clock is frozen at the park)
    idleT += ctx.rawDt;

    for (var j = 0; j < projectShards.length; j++) {
      var pl = projectShards[j];
      var w = pl.win;
      pl.interactive = false;
      if (!w || p < w.in || p >= w.off) { pl.mesh.visible = false; continue; }

      _env.slotX = (j === 0) ? stopX : pl.x * xMul * (1 - pull);
      _env.slotY = (j === 0) ? stopY : pl.y * (1 - pull);
      _env.slotZ = camZ - C.D_READ;
      _env.sizeMul = sizeMul;
      // every card tumbles the same way on entry and exit (card 2 used
      // to spin the opposite way — it was the odd one out)
      _env.spin = 1;
      _env.camZ = camZ;

      if (p < w.park) {
        arrivePose(pl, j, p, _env);
      } else if (p < w.out) {
        parkPose(pl, _env);
      } else {
        flyOffPose(pl, p, _env);
      }

      pl.mesh.position.set(pl.px, pl.py, pl.pz);
      pl.mesh.rotation.z = pl.rz;
      pl.mesh.rotation.x = pl.rx;
      pl.mesh.rotation.y = pl.ry;
      pl.mesh.visible = pl.pz < camZ - 0.5;
      if (!pl.mesh.visible) { pl.interactive = false; continue; }

      var hovered = (active === j);
      pl.hoverF += ((hovered ? 1.25 : 1.0) - pl.hoverF) * 0.12;
      pl.dimF += (((active >= 0) && !hovered) ? 0.5 - pl.dimF : 1.0 - pl.dimF) * 0.15;

      pl.mesh.scale.setScalar(Math.max(sizeMul * pl.hoverF * (1 - pull) * pl.scl, 0.0001));
      pl.mat.opacity = pl.dimF * pl.fade;
      pl.mat.emissiveIntensity = 0.5 * pl.dimF * pl.fade;
      pl.edgeMat.opacity = 0.85 * pl.dimF * pl.fade;
    }
  }
}

const shardStream = {
  init: init,
  update: update,
  projectShards: projectShards,
  projectMeshes: projectMeshes,
  groupVisible: function () { return shardGroup.visible; }
};

export default shardStream;
