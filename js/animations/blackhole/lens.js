/* Explore Beyond — the geodesic lens pass (phase I render).
   [animation: blackhole] world -> rtWorld (straight perspective),
   then a full-screen pass traces the photon geodesic for every pixel
   (Binet equation u'' + u = 1.5 u^2, RK4 in the geodesic plane) and
   samples rtWorld at the deflected exit direction (Einstein ring /
   lensed starfield) and at each disk-plane crossing (the far side of
   the disk wraps over the shadow). Rendered at reduced resolution and
   blitted back; the dither post pass follows as usual.
   The world scene comes from this folder's hole.js (dependency
   injection through the import, no globals). */
import { M } from '../../shared/math.js';
import { dither } from '../../shared/dither.js';
import hole from './hole.js';
import { getPixelRatio, onPixelRatio } from '../../shared/pixratio.js';

var rtWorld, rtLens;
var lensMat, lensScene, lensCam;
var blitMat, blitScene, blitCam;

var BH_RS = 50; // schwarzschild radius — must match BH_RS in blackhole/hole.js

function init(ctx) {
  /* the stage's adaptive governor steps the ratio at runtime: keep
     the render-target sizes in sync without a window resize */
  onPixelRatio(function () { resize(); });

  var isMobile = ctx.isMobile;

  rtWorld = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
  });
  rtLens = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
  });

  lensMat = new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: rtWorld.texture },
      uCamPos: { value: new THREE.Vector3() },
      uCamWorld: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2(2, 2) },
      uFl: { value: 1 / Math.tan((25 * Math.PI) / 180) },
      uAspect: { value: 1 },
      uBi: { value: 0 },
      uDphi: { value: isMobile ? 0.035 : 0.024 },
      uSteps: { value: isMobile ? 900 : 1600 }
    },
    vertexShader: [
      'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uTex;',
      'uniform vec3  uCamPos;',
      'uniform mat4  uCamWorld;',
      'uniform vec2  uRes;',
      'uniform float uFl;',
      'uniform float uAspect;',
      'uniform float uBi;',
      'uniform float uDphi;',
      'uniform float uSteps;',
      'const float RS      = ' + BH_RS + '.0;             // schwarzschild radius (world units)',
      'const float B_CRIT  = 2.5980762;                    // 3*sqrt(3)/2 (in Rs units)',
      'const float PHI_MAX = 44.0;                         // ~7 turns -> captured',
      '// project a world-space direction onto the world RT (same camera)',
      'vec2 texUV(vec3 d) {',
      '  vec3 v = normalize(transpose(mat3(uCamWorld)) * d);',
      '  float dz = -v.z;',
      '  if (dz < 0.001) return vec2(2.0, 2.0);',
      '  return vec2(v.x * uFl / dz / uAspect, v.y * uFl / dz) * 0.5 + 0.5;',
      '}',
      'void main() {',
      '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
      '  // camera basis (world space)',
      '  mat3 C = mat3(uCamWorld);',
      '  vec3 ro = uCamPos;',
      '  vec3 fw = normalize(C * vec3(0.0, 0.0, -1.0));',
      '  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));',
      '  vec3 up = cross(rt, fw);',
      '  vec3 rd = normalize(fw + (uv.x * rt + uv.y * up) * (2.0 / uFl));',
      '  // work in Rs units',
      '  vec3 roU = ro / RS;',
      '  float R0 = length(roU);',
      '  vec3 nrm = cross(roU, rd);',
      '  float b = length(nrm);',
      '  vec3 col;',
      '  if (b < 1e-4) {',
      '    // (nearly) radial ray: falls straight in or goes straight out',
      '    col = (dot(rd, roU) < 0.0) ? vec3(0.0) : texture2D(uTex, texUV(rd)).rgb;',
      '  } else {',
      '    // orthonormal basis of the geodesic plane',
      '    nrm /= b;',
      '    vec3 ea = roU / R0;',
      '    vec3 eb = cross(nrm, ea);',
      '    float phi0 = atan(-ea.y, eb.y); // where the disk plane (y=0) cuts',
      '    // orbit state: u = 1/r, w = du/dphi',
      '    float u = 1.0 / R0;',
      '    float w = -dot(rd, ea) / b;',
      '    float trans = 1.0;',
      '    vec3 acc = vec3(0.0);',
      '    float maxU = u;',
      '    float phi = 0.0;',
      '    bool captured = false;',
      '    bool escaped = false;',
      '    for (int i = 0; i < 1600; i++) {',
      '      if (float(i) >= uSteps) { captured = true; break; }',
      '      if (u >= 1.0) { captured = true; break; }  // crossed the horizon',
      '      float u0 = u, w0 = w;',
      '      float s_prev = sin(phi - phi0);',
      '      // RK4 step of (u, w) -> (w, 1.5 u^2 - u)',
      '      float k1w = 1.5 * u * u - u;',
      '      float u2 = u + 0.5 * uDphi * w,  w2 = w + 0.5 * uDphi * k1w;',
      '      float k2w = 1.5 * u2 * u2 - u2;',
      '      float u3 = u + 0.5 * uDphi * w2, w3 = w + 0.5 * uDphi * k2w;',
      '      float k3w = 1.5 * u3 * u3 - u3;',
      '      float u4 = u + uDphi * w3,       w4 = w + uDphi * k3w;',
      '      float k4w = 1.5 * u4 * u4 - u4;',
      '      u += uDphi * (w + 2.0 * w2 + 2.0 * w3 + w4) / 6.0;',
      '      w += uDphi * (k1w + 2.0 * k2w + 2.0 * k3w + k4w) / 6.0;',
      '      phi += uDphi;',
      '      maxU = max(maxU, u);',
      '      // disk-plane crossing: sample the real particles at that point',
      '      float s_new = sin(phi - phi0);',
      '      if (s_prev * s_new < 0.0) {',
      '        float fc = s_prev / (s_prev - s_new);',
      '        float uc = u0 + (u - u0) * fc;',
      '        float rho = 1.0 / uc;',
      '        if (rho > 2.7 && rho < 8.8) {',
      '          float pc = phi - uDphi + uDphi * fc;',
      '          float ca = cos(pc), sa = sin(pc);',
      '          vec3 eR = ca * ea + sa * eb;',
      '          vec3 hitW = (eR / uc) * RS;',
      '          vec3 d = normalize(hitW - ro);',
      '          float edge = smoothstep(2.7, 3.05, rho) * (1.0 - smoothstep(7.9, 8.5, rho));',
      '          float a = 0.8 * edge;',
      '          acc += trans * texture2D(uTex, texUV(d)).rgb * a;',
      '          trans *= 1.0 - a;',
      '        }',
      '      }',
      '      if (u < 1.0 / 15.0 && w < 0.0) { escaped = true; break; }',
      '      if (phi > PHI_MAX) { captured = true; break; }',
      '    }',
      '    if (escaped) {',
      '      // exit direction -> the lensed starfield behind the hole',
      '      float ca = cos(phi), sa = sin(phi);',
      '      vec3 eR = ca * ea + sa * eb;',
      '      vec3 eP = -sa * ea + ca * eb;',
      '      float den = sqrt(u * u + w * w);',
      '      vec3 exitDir = normalize((-w / den) * eR + (u / den) * eP);',
      '      col = texture2D(uTex, texUV(exitDir)).rgb * trans;',
      '      // photon ring hugging the shadow',
      '      float minR = 1.0 / maxU;',
      '      if (b > B_CRIT) {',
      '        float rb = b - B_CRIT;',
      '        float ring = exp(-rb * rb * 60.0) * smoothstep(2.3, 1.6, minR);',
      '        col += ring * vec3(1.0, 0.80, 0.55) * 0.9;',
      '      }',
      '    } else {',
      '      col = vec3(0.0);',
      '    }',
      '    col += acc;',
      '  }',
      '  col = mix(vec3(0.0), col, uBi);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  lensScene = new THREE.Scene();
  lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  lensScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat));

  blitMat = new THREE.MeshBasicMaterial({
    map: new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
    depthTest: false, depthWrite: false
  });
  blitScene = new THREE.Scene();
  blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));

  resize();
}

function resize() {
  var pixelRatio = getPixelRatio();
  var w = Math.max(2, Math.floor(window.innerWidth * pixelRatio));
  var h = Math.max(2, Math.floor(window.innerHeight * pixelRatio));
  rtWorld.setSize(w, h);
  var lw = Math.min(1280, Math.max(2, Math.floor(w * 0.5)));
  var lh = Math.max(2, Math.round(lw * h / w));
  rtLens.setSize(lw, lh);
  lensMat.uniforms.uRes.value.set(lw, lh);
  lensMat.uniforms.uAspect.value = lw / lh;
}

function update(ctx) {
  // fade the whole lensed image in over H
  lensMat.uniforms.uBi.value = M.phase(0.91, 0.95, ctx.p);
}

function render(ctx) {
  var renderer = ctx.renderer, camera = ctx.camera;
  // 1) lensable world (starfield + nebulae + particle disk) -> rtWorld
  renderer.setRenderTarget(rtWorld);
  renderer.render(hole.worldScene, camera);
  // 2) exact geodesic lensing pass -> rtLens
  camera.updateMatrixWorld();
  lensMat.uniforms.uCamPos.value.copy(camera.position);
  lensMat.uniforms.uCamWorld.value.copy(camera.matrixWorld);
  lensMat.uniforms.uFl.value = 1 / Math.tan((camera.fov * 0.5) * Math.PI / 180);
  renderer.setRenderTarget(rtLens);
  renderer.render(lensScene, lensCam);
  // 3) blit the lensed image into the main RT (dither pass follows as usual)
  blitMat.map = rtLens.texture;
  renderer.setRenderTarget(dither.rt);
  renderer.render(blitScene, blitCam);
}

const lens = { init: init, resize: resize, update: update, render: render };

export default lens;
