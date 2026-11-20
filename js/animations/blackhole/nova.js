/* Explore Beyond — the nova fireball (phase G).
   [animation: blackhole] The second supernova's fireball at the star
   (z = -120), blooming as project 3 flows off (S4). It reuses the
   blast's shared 6000-particle system — blast/fireball.js exports
   makeFireballSystem(), and the same seed means both bursts are the
   same particle field, instantiated independently. */
import { M } from '../../shared/math.js';
import { makeFireballSystem } from '../blast/fireball.js';
import { getPixelRatio, onPixelRatio } from '../../shared/pixratio.js';

var fireball, fbMat;

function init(ctx) {
  var system = makeFireballSystem(getPixelRatio());
  fbMat = system.makeMaterial();
  /* the stage's adaptive governor steps the ratio at runtime: keep
     the point size in sync without a window resize */
  onPixelRatio(function (r) { fbMat.uniforms.uPixel.value = r; });
  fireball = new THREE.Points(system.geo, fbMat);
  fireball.position.set(0, 0, -120);
  fireball.frustumCulled = false;
  fireball.renderOrder = 3;
  fireball.visible = false;
  ctx.scene.add(fireball);
}

function update(ctx) {
  var p = ctx.p;
  /* fireball (second supernova) — blooms as P3 flows off (S4) */
  fireball.visible = p >= 0.89 && p <= 0.912;
  if (fireball.visible) {
    fbMat.uniforms.uExplode.value = M.easeOut(M.phase(0.89, 0.91, p));
    fbMat.uniforms.uOpacity.value = M.phase(0.89, 0.90, p) * (1 - M.phase(0.908, 0.91, p));
  }
}

function resize() {
  fbMat.uniforms.uPixel.value = getPixelRatio();
}

const nova = { init: init, update: update, resize: resize };

export default nova;
