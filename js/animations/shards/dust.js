/* Explore Beyond — dust (phase F).
   [animation: shards] Fine particles that drift forward with the
   shard flow after the blast, then get pulled toward the star's axis
   as the second supernova opens. All motion happens in the vertex
   shader via uFlow / uPull — no per-frame CPU work. */
import { M } from '../../shared/math.js';
import { random } from '../../shared/random.js';
import { config as C } from '../../config.js';
import { getPixelRatio, onPixelRatio } from '../../shared/pixratio.js';

var dust, dustMat;

function init(ctx) {
  var DUST_COUNT = C.DUST_COUNT;
  var pixelRatio = getPixelRatio();
  /* the stage's adaptive governor steps the ratio at runtime: keep
     the point size in sync without a window resize */
  onPixelRatio(function (r) { dustMat.uniforms.uPixel.value = r; });

  var dPos = new Float32Array(DUST_COUNT * 3);
  var dSiz = new Float32Array(DUST_COUNT);
  var dSed = new Float32Array(DUST_COUNT);
  (function () {
    var rand = random.mulberry32(777001);
    for (var i = 0; i < DUST_COUNT; i++) {
      dPos[i * 3] = (rand() - 0.5) * 70;
      dPos[i * 3 + 1] = (rand() - 0.5) * 70;
      dPos[i * 3 + 2] = -10 - 240 * rand();
      dSiz[i] = 1.0 + 1.8 * rand();
      dSed[i] = rand();
    }
  })();

  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSiz, 1));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSed, 1));

  dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uFlow: { value: 0 },
      uPull: { value: 0 },
      uOpacity: { value: 0 },
      uPixel: { value: pixelRatio }
    },
    vertexShader: [
      'uniform float uFlow;',
      'uniform float uPull;',
      'uniform float uPixel;',
      'attribute float aSize;',
      'attribute float aSeed;',
      'varying float vA;',
      'void main() {',
      '  vec3 p = position;',
      '  p.z += uFlow;',
      '  p.xy *= (1.0 - uPull);',
      '  p.x += sin(p.z * 0.043 + aSeed * 6.2831) * 0.8;',
      '  p.y += cos(p.z * 0.031 + aSeed * 4.71) * 0.8;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  if (mv.z > -0.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vA = 0.0; return; }',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = aSize * uPixel;',
      '  vA = 1.0;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity;',
      'varying float vA;',
      'void main() {',
      '  vec2 c = gl_PointCoord - 0.5;',
      '  float a = smoothstep(0.5, 0.1, length(c)) * uOpacity * vA;',
      '  if (a < 0.004) discard;',
      '  gl_FragColor = vec4(0.85, 0.88, 1.0, a);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 1;
  dust.visible = false;
  ctx.scene.add(dust);
}

function update(ctx) {
  var p = ctx.p, pull = ctx.pull;
  /* dust drifting forward with the flow */
  dust.visible = p >= 0.52 && p < 0.91;
  if (dust.visible) {
    dustMat.uniforms.uFlow.value = (p > 0.58) ? (p - 0.58) * C.FLOW * 0.9 : 0;
    dustMat.uniforms.uPull.value = pull;
    dustMat.uniforms.uOpacity.value = 0.55 * M.phase(0.52, 0.57, p) * (1 - M.phase(0.875, 0.915, p));
  }
}

function resize() {
  dustMat.uniforms.uPixel.value = getPixelRatio();
}

const dustModule = { init: init, update: update, resize: resize };

export default dustModule;
