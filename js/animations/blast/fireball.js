/* Explore Beyond — the fireball system (phases E + G).
   [animation: blast] One 6000-particle shell geometry; position is
   computed in the vertex shader from (dir, speed, size, seed)
   attributes driven by uExplode — no CPU updates. This module owns
   the planet fireball at the origin (E, the planet breaks) and
   exports makeFireballSystem(), which the second supernova imports
   (blackhole/nova.js, phase G, where the black hole is born). The
   same seed on both sides means both bursts are the identical
   particle field, instantiated independently. */
import { M } from '../../shared/math.js';
import { random } from '../../shared/random.js';
import { config as C } from '../../config.js';
import { getPixelRatio, onPixelRatio } from '../../shared/pixratio.js';

/* the shared system: geometry + shaders + material factory.
   Call it once per fireball instance and add a THREE.Points of your
   own at the spot you need the burst. */
export function makeFireballSystem(pixelRatio) {
  var FIRE_COUNT = C.FIRE_COUNT;

  var fPos = new Float32Array(FIRE_COUNT * 3);
  var fDir = new Float32Array(FIRE_COUNT * 3);
  var fSpd = new Float32Array(FIRE_COUNT);
  var fSiz = new Float32Array(FIRE_COUNT);
  var fSed = new Float32Array(FIRE_COUNT);
  (function () {
    var rand = random.mulberry32(424242);
    for (var i = 0; i < FIRE_COUNT; i++) {
      var u = rand() * 2 - 1;
      var ang = rand() * Math.PI * 2;
      var s = Math.sqrt(1 - u * u);
      fDir[i * 3] = s * Math.cos(ang);
      fDir[i * 3 + 1] = u;
      fDir[i * 3 + 2] = s * Math.sin(ang);
      fSpd[i] = 0.4 + 0.6 * rand();
      fSiz[i] = 1.0 + 2.5 * Math.pow(rand(), 2);
      fSed[i] = rand();
    }
  })();

  var fbGeo = new THREE.BufferGeometry();
  fbGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  fbGeo.setAttribute('aDir', new THREE.BufferAttribute(fDir, 3));
  fbGeo.setAttribute('aSpeed', new THREE.BufferAttribute(fSpd, 1));
  fbGeo.setAttribute('aSize', new THREE.BufferAttribute(fSiz, 1));
  fbGeo.setAttribute('aSeed', new THREE.BufferAttribute(fSed, 1));

  var fbVert = [
    'uniform float uExplode;',
    'uniform float uPixel;',
    'attribute vec3 aDir;',
    'attribute float aSpeed;',
    'attribute float aSize;',
    'attribute float aSeed;',
    'varying vec3 vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  // slight swirl: rotate the direction a little with explosion progress',
    '  float sw = aSeed * 6.2831 + uExplode * (0.4 + aSeed);',
    '  float cs = cos(sw * 0.35), ss = sin(sw * 0.35);',
    '  vec3 dir = vec3(cs * aDir.x - ss * aDir.z, aDir.y, ss * aDir.x + cs * aDir.z);',
    '  vec3 pos = dir * (aSpeed * uExplode * 50.0);',
    '  pos += 0.8 * uExplode * vec3(',
    '    sin(aSeed * 40.0 + uExplode * 6.0),',
    '    cos(aSeed * 31.0 + uExplode * 5.0),',
    '    sin(aSeed * 23.0 + uExplode * 7.0));',
    '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = aSize * uPixel * (52.0 / max(0.1, -mv.z));',
    '  // color by age: white -> yellow -> orange -> deep red',
    '  vec3 c = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.85, 0.30), smoothstep(0.0, 0.30, uExplode));',
    '  c = mix(c, vec3(1.0, 0.45, 0.08), smoothstep(0.25, 0.60, uExplode));',
    '  c = mix(c, vec3(0.50, 0.10, 0.35), smoothstep(0.55, 1.00, uExplode));',
    '  c *= 0.75 + 0.5 * fract(aSeed * 7.13);',
    '  vColor = c;',
    '  vAlpha = 1.0 - 0.6 * smoothstep(0.5, 1.0, uExplode);',
    '}'
  ].join('\n');

  var fbFrag = [
    'uniform float uOpacity;',
    'varying vec3 vColor;',
    'varying float vAlpha;',
    'void main() {',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float d = length(c);',
    '  float a = smoothstep(0.5, 0.05, d) * vAlpha * uOpacity;',
    '  if (a < 0.003) discard;',
    '  gl_FragColor = vec4(vColor, a);',
    '}'
  ].join('\n');

  function makeFireballMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uExplode: { value: 0 },
        uOpacity: { value: 0 },
        uPixel: { value: pixelRatio }
      },
      vertexShader: fbVert,
      fragmentShader: fbFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  return { geo: fbGeo, makeMaterial: makeFireballMaterial };
}

/* ---- the planet fireball (phase E: the planet breaks) ---- */

var fireball, fbMat;

function init(ctx) {
  var system = makeFireballSystem(getPixelRatio());
  fbMat = system.makeMaterial();
  /* the stage's adaptive governor steps the ratio at runtime: keep
     the point size in sync without a window resize */
  onPixelRatio(function (r) { fbMat.uniforms.uPixel.value = r; });
  fireball = new THREE.Points(system.geo, fbMat);
  fireball.frustumCulled = false;
  fireball.renderOrder = 3;
  fireball.visible = false;
  ctx.scene.add(fireball);
}

function update(ctx) {
  var p = ctx.p, ex = ctx.ex;

  /* fireball (the planet breaks). The embers die out before card 2 is
     born (gone by 0.632, card 2's in is 0.636): card 1 is the only
     card that arrives out of the blast, and every card's arrival
     plays in the same clean shard stream afterwards */
  fireball.visible = p >= 0.535 && p <= 0.632;
  if (fireball.visible) {
    fbMat.uniforms.uExplode.value = ex;
    fbMat.uniforms.uOpacity.value =
      M.phase(0.535, 0.545, p) *
      (0.25 + 0.75 * (1 - M.phase(0.545, 0.58, p))) *
      (1 - M.phase(0.58, 0.632, p));
  }
}

function resize() {
  fbMat.uniforms.uPixel.value = getPixelRatio();
}

const fireballA = { init: init, update: update, resize: resize };

export default fireballA;
