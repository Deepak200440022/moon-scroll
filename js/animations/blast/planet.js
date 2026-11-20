/* Explore Beyond — the planet (phases A-D).
   [animation: blast] Procedural cratered surface (color + bump from
   canvas), spin-up with an orange emissive crack web as it heats,
   gone at the flash. The moon belongs to the blast — this is where it
   spins up and dies — but the zoom frames it (and every standalone run
   that needs it) by importing this module. */
import { M } from '../../shared/math.js';
import { random } from '../../shared/random.js';

var planet, planetMat, heatUniform;

// 2D value noise, periodic in u (matches the sphere's UV seam), clamped in v.
function makeNoise2D(rand, size) {
  var grid = new Float32Array(size * size);
  for (var i = 0; i < grid.length; i++) grid[i] = rand();
  return function (u, v) {
    var x = u * size;
    var y = v * size;
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var sx = xf * xf * (3 - 2 * xf);
    var sy = yf * yf * (3 - 2 * yf);
    var xi0 = ((xi % size) + size) % size;
    var xi1 = ((xi + 1) % size + size) % size;
    var yi0 = yi < 0 ? 0 : (yi > size - 1 ? size - 1 : yi);
    var yi1 = (yi + 1) < 0 ? 0 : ((yi + 1) > size - 1 ? size - 1 : (yi + 1));
    var a = grid[yi0 * size + xi0], b = grid[yi0 * size + xi1];
    var c = grid[yi1 * size + xi0], d = grid[yi1 * size + xi1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function fbm(noise, u, v, octaves) {
  var sum = 0, amp = 1, total = 0;
  for (var i = 0; i < octaves; i++) {
    sum += amp * noise(u, v);
    total += amp;
    u = (u * 2) % 1; // integer frequency doubling keeps the x seam matched
    v = v * 2 + 0.5;
    amp *= 0.5;
  }
  return sum / total;
}

function buildPlanetTexture(renderer) {
  var W = 2048, H = 1024;
  var c = document.createElement('canvas'); c.width = W; c.height = H;
  var ctx = c.getContext('2d');
  var bc = document.createElement('canvas'); bc.width = W; bc.height = H;
  var bctx = bc.getContext('2d');

  var rand = random.mulberry32(20261112);
  var noiseGrain = makeNoise2D(random.mulberry32(1337), 64);
  var noiseBroad = makeNoise2D(random.mulberry32(4242), 24);

  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, W, H);

  var img = ctx.getImageData(0, 0, W, H);
  var px = img.data;
  var bimg = bctx.getImageData(0, 0, W, H);
  var bpx = bimg.data;

  for (var y = 0; y < H; y++) {
    var v = y / H;
    for (var x = 0; x < W; x++) {
      var u = x / W;
      var i = (y * W + x) * 4;
      var grain = fbm(noiseGrain, u, v, 4);
      var broad = fbm(noiseBroad, u, v, 3);
      var maria = M.smoothstep(0.52, 0.64, broad);
      var a = M.clamp(138 + (grain - 0.5) * 30 - maria * 46, 68, 178);
      px[i] = a; px[i + 1] = a; px[i + 2] = a + 2; px[i + 3] = 255;
      var bv = M.clamp(128 + (grain - 0.5) * 38 - maria * 14, 60, 196);
      bpx[i] = bv; bpx[i + 1] = bv; bpx[i + 2] = bv; bpx[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  // One crater: dark sunken floor, shadowed inner wall (sun is upper-left),
  // bright rim arc on the lit side; same shape written to the bump canvas.
  function crater(cx, cy, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

    var g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r);
    g.addColorStop(0, 'rgba(92,92,96,0.60)');
    g.addColorStop(0.55, 'rgba(106,106,110,0.34)');
    g.addColorStop(0.85, 'rgba(138,138,142,0.10)');
    g.addColorStop(1, 'rgba(138,138,142,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    g = ctx.createRadialGradient(cx + r * 0.85, cy + r * 0.85, r * 0.1, cx + r * 0.85, cy + r * 0.85, r * 1.5);
    g.addColorStop(0, 'rgba(46,46,52,0.58)');
    g.addColorStop(0.5, 'rgba(46,46,52,0.28)');
    g.addColorStop(1, 'rgba(46,46,52,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    var ox = cx - r * 0.55, oy = cy - r * 0.55;
    g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 0.62);
    g.addColorStop(0, 'rgba(226,226,230,0)');
    g.addColorStop(0.20, 'rgba(226,226,230,0)');
    g.addColorStop(0.36, 'rgba(230,230,234,0.45)');
    g.addColorStop(0.52, 'rgba(226,226,230,0)');
    g.addColorStop(1, 'rgba(226,226,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox - r * 1.25, oy - r * 1.25, r * 2.5, r * 2.5);

    bctx.save();
    bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.clip();
    var bg = bctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r);
    bg.addColorStop(0, 'rgb(82,82,82)');
    bg.addColorStop(0.6, 'rgb(102,102,102)');
    bg.addColorStop(0.85, 'rgb(118,118,118)');
    bg.addColorStop(1, 'rgb(128,128,128)');
    bctx.fillStyle = bg;
    bctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    bctx.restore();

    var br = bctx.createRadialGradient(cx, cy, r * 0.86, cx, cy, r * 1.08);
    br.addColorStop(0, 'rgba(128,128,128,0)');
    br.addColorStop(0.5, 'rgb(186,186,186)');
    br.addColorStop(1, 'rgba(128,128,128,0)');
    bctx.fillStyle = br;
    bctx.fillRect(cx - r * 1.15, cy - r * 1.15, r * 2.3, r * 2.3);
  }

  for (var k = 0; k < 250; k++) {
    var x0 = rand() * W;
    var y0 = rand() * H;
    var r0 = 2 + 27 * Math.pow(rand(), 2.4);
    for (var dx = -W; dx <= W; dx += W) {
      var cx = x0 + dx;
      if (cx + r0 * 1.25 < 0 || cx - r0 * 1.25 > W) continue;
      crater(cx, y0, r0);
    }
  }

  var colorTex = new THREE.CanvasTexture(c);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var bumpTex = new THREE.CanvasTexture(bc);
  return { color: colorTex, bump: bumpTex };
}

function init(ctx) {
  var planetTex = buildPlanetTexture(ctx.renderer);
  heatUniform = { value: 0 };

  planetMat = new THREE.MeshStandardMaterial({
    map: planetTex.color,
    bumpMap: planetTex.bump,
    bumpScale: 1.5,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(0x000000)
  });

  // uHeat: orange-white emissive crack web (voronoi cell borders from noise)
  // that grows across the surface as the planet spins up.
  planetMat.onBeforeCompile = function (shader) {
    shader.uniforms.uHeat = heatUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('uniform vec3 emissive;', [
        'uniform vec3 emissive;',
        'uniform float uHeat;',
        'varying vec3 vObjPos;',
        'float ckHash(vec3 p) {',
        '  p = fract(p * 0.3183099 + 0.1);',
        '  p += dot(p, p.zyx + 31.32);',
        '  return fract((p.x + p.y) * p.z);',
        '}',
        'float ckNoise(vec3 x) {',
        '  vec3 i = floor(x); vec3 f = fract(x);',
        '  vec3 u = f * f * (3.0 - 2.0 * f);',
        '  return mix(',
        '    mix(mix(ckHash(i), ckHash(i + vec3(1.0, 0.0, 0.0)), u.x),',
        '        mix(ckHash(i + vec3(0.0, 1.0, 0.0)), ckHash(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),',
        '    mix(mix(ckHash(i + vec3(0.0, 0.0, 1.0)), ckHash(i + vec3(1.0, 0.0, 1.0)), u.x),',
        '        mix(ckHash(i + vec3(0.0, 1.0, 1.0)), ckHash(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),',
        '    u.z);',
        '}',
        'float ckFbm(vec3 p) {',
        '  float v = 0.0; float a = 0.5;',
        '  for (int i = 0; i < 3; i++) { v += a * ckNoise(p); p = p * 2.03 + 3.7; a *= 0.5; }',
        '  return v;',
        '}',
        'float ckCrack(vec3 x) {',
        '  vec3 ip = floor(x); vec3 fp = fract(x);',
        '  float F1 = 1e5; float F2 = 1e5;',
        '  for (int k = -1; k <= 1; k++)',
        '  for (int j = -1; j <= 1; j++)',
        '  for (int i = -1; i <= 1; i++) {',
        '    vec3 g = vec3(float(i), float(j), float(k));',
        '    float h = ckHash(ip + g);',
        '    vec3 o = vec3(h, fract(h * 5.7), fract(h * 13.1)) - 0.5;',
        '    float d = length(g + o - fp);',
        '    if (d < F1) { F2 = F1; F1 = d; }',
        '    else if (d < F2) { F2 = d; }',
        '  }',
        '  return F2 - F1;',
        '}'
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'if (uHeat > 0.001) {',
        '  vec3 cp = vObjPos * 0.7;',
        '  float e = ckCrack(cp);',
        '  float w = 0.04 + 0.30 * uHeat;',
        '  float line = 1.0 - smoothstep(0.0, w, e);',
        '  float mask = smoothstep(0.62 - 0.5 * uHeat, 0.85, ckFbm(cp * 0.9 + 7.31));',
        '  vec3 ccol = mix(vec3(1.0, 0.32, 0.05), vec3(1.0, 0.85, 0.55), uHeat);',
        '  totalEmissiveRadiance += ccol * line * mask * uHeat * 3.0;',
        '}'
      ].join('\n'));
  };

  planet = new THREE.Mesh(new THREE.SphereGeometry(5, 128, 128), planetMat);
  ctx.scene.add(planet);
}

function update(ctx) {
  var p = ctx.p, t = ctx.t;
  planet.position.set(0, 0, ctx.planetZ);
  planet.visible = p < 0.535;
  planet.rotation.y = p * 6 + ctx.spin * 60;
  planet.rotation.x = 0.25;
  planet.scale.setScalar(1 + Math.sin(t * 60) * 0.01 * ctx.spin);
  heatUniform.value = M.phase(0.42, 0.52, p);
}

const planetModule = { init: init, update: update };

export default planetModule;
