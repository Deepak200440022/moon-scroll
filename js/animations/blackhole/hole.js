/* Explore Beyond — the black hole world (phases H-I).
   [animation: blackhole] A real GR finale: exact Schwarzschild photon
   geodesics (see blackhole/lens.js) lens this render target of the
   world — a dense starfield, nebulae, and an accretion disk of BH_N
   particles on Newtonian orbits (a = GM/r^2). Rays crossing the
   horizon form the shadow; rays that escape sample the starfield in
   their deflected direction (Einstein ring); every crossing of the
   disk plane samples the real particles at that 3D point, so the far
   side of the disk wraps over the shadow. Disk: warm primary, cyan
   secondary, plunging infall stream; particles crossing the horizon
   are consumed (EATEN counter) and respawn at the outer edge.
   This module owns the world scene + particle simulation; the lens
   pass itself lives in blackhole/lens.js. The EATEN callback is
   injected by the folder entry (init(ctx, { onEaten })). */
import { M } from '../../shared/math.js';
import { makeGlowTexture, makeNebulaTexture } from '../../shared/textures.js';
import { getPixelRatio, onPixelRatio } from '../../shared/pixratio.js';

var BH_RS, BH_GM, BH_DRAG, BH_DISK_IN, BH_DISK_OUT, BH_CULL, BH_N;

var bhPos, bhVel, bhCol, bhSiz, bhType;
var bhGeo, bhMat, bhPoints;
var bhGlowMat, bhGlow;
var bhStarMat;
var worldScene;
var worldFaders;
var swGeo, swMat, swPoints;
var swU, swSpd, swWind, swTh0, swJit, swBase, swPos, swCol, swSiz;
var bhGroup;
var SWIRL_N;

var eaten = 0, eatenShown = -1;
var onEaten = null;

// (near-)circular orbit placement; eaten particles respawn at the outer
// edge of their stream so the disk keeps feeding itself. Plungers get low
// tangential velocity + an inward kick so they cross the horizon.
function bhSpawn(i, initial) {
  var i3 = i * 3;
  var t = bhType[i];
  var a = Math.random() * Math.PI * 2;
  var r, vt, vr;
  if (t === 2) {
    r = initial ? (320 + 160 * Math.random()) : (340 + 150 * Math.random());
    vt = Math.sqrt(BH_GM / r) * (0.28 + 0.20 * Math.random());
    vr = -(8 + 22 * Math.random());
  } else if (t === 1) {
    r = initial ? (BH_DISK_IN + 110 * Math.pow(Math.random(), 1.4))
                : (BH_DISK_IN + 60 * Math.random());
    vt = Math.sqrt(BH_GM / r) * (0.94 + 0.06 * Math.random());
    vr = (Math.random() - 0.5) * 12;
  } else {
    r = initial ? (BH_DISK_IN + (BH_DISK_OUT - BH_DISK_IN) * Math.pow(Math.random(), 1.6))
                : (380 + 50 * Math.random());
    vt = Math.sqrt(BH_GM / r) * (0.94 + 0.06 * Math.random());
    vr = (Math.random() - 0.5) * 12;
  }
  bhPos[i3] = Math.cos(a) * r;
  bhPos[i3 + 1] = (Math.random() - 0.5) * (4 + 10 * (r / BH_DISK_OUT));
  bhPos[i3 + 2] = Math.sin(a) * r;
  bhVel[i3] = -Math.sin(a) * vt - Math.cos(a) * vr;   // tangential + radial
  bhVel[i3 + 1] = (Math.random() - 0.5) * 1.2;
  bhVel[i3 + 2] = Math.cos(a) * vt - Math.sin(a) * vr;
}

/* time-driven fall for the infall swirl (independent of scroll, so the
   hole is always alive). Each particle spawns at the outer disk edge,
   winds up and falls (slow out there, fast near the hole), is consumed
   at the shadow's rim and respawns outside. It lives in the disk plane,
   so the geodesic pass lenses it and wraps the far side over the shadow
   just like the real disk. */
function stepSwirl(dt) {
  for (var i = 0; i < SWIRL_N; i++) {
    swU[i] += dt * swSpd[i] * (0.16 + 0.6 * swU[i]);  // slow outside, fast inside
    if (swU[i] >= 1) swU[i] -= 1;
    var u = swU[i];
    var r = 136 + (430 - 136) * Math.pow(1 - u, 1.7);
    var th = swTh0[i] + swWind[i] * Math.pow(u, 1.15) + swJit[i] * 0.18;
    var i3 = i * 3;
    swPos[i3] = Math.cos(th) * r;
    swPos[i3 + 1] = swJit[i] * 4 * (r / 430);
    swPos[i3 + 2] = Math.sin(th) * r;
    var fin = u < 0.1 ? u / 0.1 : 1;
    var fout = u > 0.9 ? (1 - u) / 0.1 : 1;
    var br = (0.75 + 0.45 * u) * fin * fout;          // hot white-blue infall, heats as it falls
    swCol[i3] = (0.70 + 0.22 * u) * br;
    swCol[i3 + 1] = (0.80 + 0.14 * u) * br;
    swCol[i3 + 2] = 1.0 * br;
    swSiz[i] = swBase[i] * (0.5 + 0.5 * (1 - u));
  }
  swGeo.attributes.position.needsUpdate = true;
  swGeo.attributes.aColor.needsUpdate = true;
  swGeo.attributes.aSize.needsUpdate = true;
}

/* Newtonian step: a = GM/r^2 toward the origin; horizon crossing ->
   respawn (and bump the EATEN counter). */
function stepBH(dt) {
  var drag = 1 - BH_DRAG * dt;
  for (var i = 0; i < BH_N; i++) {
    var i3 = i * 3;
    var x = bhPos[i3], y = bhPos[i3 + 1], z = bhPos[i3 + 2];
    var r2 = x * x + y * y + z * z;
    var r = Math.sqrt(r2);
    if (r < BH_RS) { bhSpawn(i, false); eaten++; continue; }
    var s = (BH_GM / r2) * dt / r;
    bhVel[i3] = (bhVel[i3] - x * s) * drag;
    bhVel[i3 + 1] = (bhVel[i3 + 1] - y * s) * drag;
    bhVel[i3 + 2] = (bhVel[i3 + 2] - z * s) * drag;
    bhPos[i3] += bhVel[i3] * dt;
    bhPos[i3 + 1] += bhVel[i3 + 1] * dt;
    bhPos[i3 + 2] += bhVel[i3 + 2] * dt;
  }
  bhGeo.attributes.position.needsUpdate = true;
  if (eaten !== eatenShown) {
    eatenShown = eaten;
    var es = String(eaten);
    while (es.length < 6) es = '0' + es;
    if (onEaten) onEaten('EATEN ' + es);
  }
}

function init(ctx, opts) {
  onEaten = (opts && opts.onEaten) || null;
  /* the stage's adaptive governor steps the ratio at runtime: keep
     the point sizes in sync without a window resize */
  onPixelRatio(function () { resize(); });

  var isMobile = ctx.isMobile;
  /* 48k (was 60k): the disk is a dense additive field, so a count cut
     compensated by uGain reads identically — it just cuts vertex work
     and overdraw on the software-GL machines the governor targets */
  BH_N = isMobile ? 18000 : 48000;
  BH_RS = 50;        // schwarzschild radius = event horizon
  BH_GM = 400000;    // gravitational parameter (particle orbits)
  BH_DRAG = 0.025;   // 2.5%/s velocity loss -> inspiral, steady infall
  BH_DISK_IN = 150;  // 3 Rs (ISCO)
  BH_DISK_OUT = 420; // 8.4 Rs
  BH_CULL = 138;     // particles inside the shadow are not rendered

  /* ---- accretion disk particles ---- */
  bhPos = new Float32Array(BH_N * 3);
  bhVel = new Float32Array(BH_N * 3);
  bhCol = new Float32Array(BH_N * 3);
  bhSiz = new Float32Array(BH_N);
  bhType = new Uint8Array(BH_N); // 0 warm primary, 1 cyan secondary, 2 plunging infall

  (function () {
    for (var i = 0; i < BH_N; i++) {
      bhType[i] = (i % 9 === 0) ? 1 : ((i % 11 === 0) ? 2 : 0); // ~11% cyan, ~9% plunging
      bhSpawn(i, true);
      var i3 = i * 3;
      var x = bhPos[i3], y = bhPos[i3 + 1], z = bhPos[i3 + 2];
      var rr = Math.sqrt(x * x + y * y + z * z);
      var hot = 1 - M.clamp((rr - BH_DISK_IN) / (BH_DISK_OUT - BH_DISK_IN), 0, 1);
      var j = Math.random();
      if (bhType[i] === 1) {
        bhCol[i3] = 0.40 + 0.30 * hot;
        bhCol[i3 + 1] = 0.70 + 0.25 * hot;
        bhCol[i3 + 2] = 1.0;
      } else if (bhType[i] === 2) {
        bhCol[i3] = 1.0;
        bhCol[i3 + 1] = 0.70 + 0.20 * hot;
        bhCol[i3 + 2] = 0.35 + 0.25 * hot;
      } else {
        bhCol[i3] = 0.95 + 0.05 * hot;
        bhCol[i3 + 1] = 0.55 + 0.35 * hot * (0.8 + 0.4 * j);
        bhCol[i3 + 2] = 0.28 + 0.50 * hot * hot;
      }
      bhSiz[i] = (2.0 + 5.5 * Math.random() * Math.random()) * (0.8 + 0.6 * hot);
    }
  })();

  bhGeo = new THREE.BufferGeometry();
  bhGeo.setAttribute('position', new THREE.BufferAttribute(bhPos, 3).setUsage(THREE.DynamicDrawUsage));
  bhGeo.setAttribute('aColor', new THREE.BufferAttribute(bhCol, 3));
  bhGeo.setAttribute('aSize', new THREE.BufferAttribute(bhSiz, 1));

  bhMat = new THREE.ShaderMaterial({
    /* uGain is the 60k -> 48k count compensation (each particle a bit
       brighter, the same total light) */
    uniforms: { uPixel: { value: getPixelRatio() }, uOpacity: { value: 0 }, uGain: { value: 0.69 } },
    vertexShader: [
      'attribute float aSize;',
      'attribute vec3 aColor;',
      'uniform float uPixel;',
      'varying vec3 vColor;',
      'void main() {',
      // inside the shadow: clip (the geodesic pass draws the silhouette)
      '  if (dot(position, position) < ' + (BH_CULL * BH_CULL) + '.0) {',
      '    gl_PointSize = 0.0;',
      '    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);',
      '    return;',
      '  }',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = aSize * uPixel * (800.0 / max(1.0, -mv.z));',
      '  vColor = aColor;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity;',
      'uniform float uGain;',
      'varying vec3 vColor;',
      'void main() {',
      '  vec2 c = gl_PointCoord - 0.5;',
      '  float d = length(c);',
      '  float glow = smoothstep(0.5, 0.08, d);',
      '  float core = smoothstep(0.16, 0.0, d);',
      '  float a = (glow * 0.5 + core * 0.6) * uGain * uOpacity;',
      '  if (a < 0.004) discard;',
      '  gl_FragColor = vec4(vColor * (0.75 + 0.6 * core), a);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  bhPoints = new THREE.Points(bhGeo, bhMat);
  bhPoints.frustumCulled = false;

  // soft halo around the hole (the geodesic pass draws the exact shadow)
  bhGlowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,244,224,0.85)', 'rgba(255,168,84,0.30)'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  bhGlow = new THREE.Sprite(bhGlowMat);
  bhGlow.scale.setScalar(560);

  /* ---- lensable world: dense starfield + nebulae (sampled by the
         geodesic pass; everything in here gets gravitationally lensed
         for free) ---- */
  worldScene = new THREE.Scene();
  worldScene.background = new THREE.Color(0x020309);

  worldFaders = []; // { material, base } — opacity scales with the fade-in
  function addNebula(x, y, z, sx, sy, stops, op) {
    var m = new THREE.SpriteMaterial({
      map: makeNebulaTexture(stops),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var s = new THREE.Sprite(m);
    s.position.set(x, y, z);
    s.scale.set(sx, sy, 1);
    worldScene.add(s);
    worldFaders.push({ mat: m, base: op });
  }
  addNebula(700, 550, -1850, 2600, 2600,
    [[0, 'rgba(120,90,220,0.55)'], [0.4, 'rgba(90,60,180,0.22)'], [1, 'rgba(60,40,120,0)']], 0.55);
  addNebula(-1750, 300, 850, 3800, 950,
    [[0, 'rgba(200,215,255,0.50)'], [0.45, 'rgba(160,170,230,0.20)'], [1, 'rgba(120,130,200,0)']], 0.50);
  addNebula(1850, -400, -750, 2300, 2300,
    [[0, 'rgba(255,150,90,0.38)'], [0.5, 'rgba(200,90,60,0.15)'], [1, 'rgba(150,60,40,0)']], 0.42);
  addNebula(-500, -850, 1650, 2400, 2400,
    [[0, 'rgba(150,110,235,0.48)'], [0.5, 'rgba(110,80,200,0.18)'], [1, 'rgba(80,60,160,0)']], 0.45);

  // crisp little stars on a far shell — the field the geodesics stretch
  bhStarMat = new THREE.ShaderMaterial({
    uniforms: { uPixel: { value: getPixelRatio() }, uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: [
      'attribute float aSize;',
      'attribute vec3 aColor;',
      'attribute float aSeed;',
      'uniform float uPixel;',
      'uniform float uTime;',
      'varying vec3 vColor;',
      'varying float vTw;',
      'void main() {',
      '  vColor = aColor;',
      '  vTw = 0.72 + 0.28 * sin(uTime * (0.5 + 1.5 * fract(aSeed * 7.31)) + aSeed * 40.0);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '  gl_PointSize = aSize * uPixel;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity;',
      'varying vec3 vColor;',
      'varying float vTw;',
      'void main() {',
      '  vec2 c = gl_PointCoord - 0.5;',
      '  float d = length(c);',
      '  float a = smoothstep(0.5, 0.1, d);',
      '  a *= a * vTw * uOpacity;',
      '  if (a < 0.003) discard;',
      '  gl_FragColor = vec4(vColor, a);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  (function () {
    var n = isMobile ? 8000 : 18000;
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    var siz = new Float32Array(n), seed = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var i3 = i * 3;
      var th = Math.random() * Math.PI * 2, phh = Math.acos(2 * Math.random() - 1);
      var r = 900 + 700 * Math.random();
      pos[i3] = r * Math.sin(phh) * Math.cos(th);
      pos[i3 + 1] = r * Math.cos(phh);
      pos[i3 + 2] = r * Math.sin(phh) * Math.sin(th);
      var tc = Math.random(), br = (0.35 + 0.65 * Math.random() * Math.random()) * 0.55;
      if (tc < 0.55)      { col[i3] = 0.72 * br; col[i3 + 1] = 0.80 * br; col[i3 + 2] = 1.00 * br; }
      else if (tc < 0.82) { col[i3] = 1.00 * br; col[i3 + 1] = 1.00 * br; col[i3 + 2] = 1.00 * br; }
      else                { col[i3] = 1.00 * br; col[i3 + 1] = 0.86 * br; col[i3 + 2] = 0.68 * br; }
      siz[i] = 1.0 + 2.4 * Math.random() * Math.random();
      seed[i] = Math.random();
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    var pts = new THREE.Points(g, bhStarMat);
    pts.frustumCulled = false;
    worldScene.add(pts);
  })();

  /* ---- infall swirl streams ---- */
  SWIRL_N = isMobile ? 2000 : 5000;
  var SWIRL_STREAMS = 9;
  var SW_OUT = 430, SW_IN = 136;
  swPos = new Float32Array(SWIRL_N * 3);
  swCol = new Float32Array(SWIRL_N * 3);
  swSiz = new Float32Array(SWIRL_N);
  swU = new Float32Array(SWIRL_N);      // fall progress 0 (outside) .. 1 (eaten)
  swSpd = new Float32Array(SWIRL_N);
  swWind = new Float32Array(SWIRL_N);
  swTh0 = new Float32Array(SWIRL_N);
  swJit = new Float32Array(SWIRL_N);
  swBase = new Float32Array(SWIRL_N);
  (function () {
    for (var i = 0; i < SWIRL_N; i++) {
      var s = i % SWIRL_STREAMS;
      swU[i] = Math.random();
      swSpd[i] = 0.8 + 0.5 * Math.random();
      swWind[i] = 16 + 10 * Math.random();                    // radians wound per fall
      swTh0[i] = (s / SWIRL_STREAMS) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      swJit[i] = Math.random() - 0.5;
      swBase[i] = 3.4 + 4.0 * Math.random() * Math.random();
    }
  })();
  swGeo = new THREE.BufferGeometry();
  swGeo.setAttribute('position', new THREE.BufferAttribute(swPos, 3).setUsage(THREE.DynamicDrawUsage));
  swGeo.setAttribute('aColor', new THREE.BufferAttribute(swCol, 3).setUsage(THREE.DynamicDrawUsage));
  swGeo.setAttribute('aSize', new THREE.BufferAttribute(swSiz, 1).setUsage(THREE.DynamicDrawUsage));
  swMat = new THREE.ShaderMaterial({
    uniforms: { uPixel: { value: getPixelRatio() }, uOpacity: { value: 0 } },
    vertexShader: [
      'attribute float aSize;',
      'attribute vec3 aColor;',
      'uniform float uPixel;',
      'varying vec3 vColor;',
      'void main() {',
      '  if (dot(position, position) < ' + (BH_CULL * BH_CULL) + '.0) {',
      '    gl_PointSize = 0.0;',
      '    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);',
      '    return;',
      '  }',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = aSize * uPixel * (800.0 / max(1.0, -mv.z));',
      '  vColor = aColor;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity;',
      'varying vec3 vColor;',
      'void main() {',
      '  vec2 c = gl_PointCoord - 0.5;',
      '  float d = length(c);',
      '  float glow = smoothstep(0.5, 0.08, d);',
      '  float core = smoothstep(0.16, 0.0, d);',
      '  float a = (glow * 0.5 + core * 0.6) * uOpacity;',
      '  if (a < 0.004) discard;',
      '  gl_FragColor = vec4(vColor * (0.75 + 0.6 * core), a);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  swPoints = new THREE.Points(swGeo, swMat);
  swPoints.frustumCulled = false;

  bhGroup = new THREE.Group();
  bhGroup.add(bhGlow);
  bhGroup.add(bhPoints);
  bhGroup.add(swPoints);
  bhGroup.visible = false;
  worldScene.add(bhGroup);
}

function update(ctx) {
  /* black hole: exact Schwarzschild geodesic lensing over the particle world */
  var p = ctx.p, t = ctx.t;
  var bhOn = p >= 0.91;
  bhGroup.visible = bhOn;
  if (!bhOn) return;

  var bi = M.phase(0.91, 0.95, p);
  bhMat.uniforms.uOpacity.value = bi;
  bhGlowMat.opacity = 0.4 * bi;
  bhGroup.scale.setScalar(0.75 + 0.25 * bi);
  bhGroup.rotation.y = t * 0.06;
  bhStarMat.uniforms.uTime.value = t;
  bhStarMat.uniforms.uOpacity.value = bi;
  for (var wfi = 0; wfi < worldFaders.length; wfi++) {
    worldFaders[wfi].mat.opacity = worldFaders[wfi].base * bi;
  }
  swMat.uniforms.uOpacity.value = bi;
  if (p > 0.915) {
    stepBH(Math.min(ctx.dt, 0.05));
    stepSwirl(Math.min(ctx.dt, 0.05));
  }
}

function resize() {
  var pixelRatio = getPixelRatio();
  bhMat.uniforms.uPixel.value = pixelRatio;
  bhStarMat.uniforms.uPixel.value = pixelRatio;
  swMat.uniforms.uPixel.value = pixelRatio;
}

const hole = {
  init: init,
  update: update,
  resize: resize,
  get worldScene() { return worldScene; }
};

export default hole;
