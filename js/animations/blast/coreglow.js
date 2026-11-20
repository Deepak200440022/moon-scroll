/* Explore Beyond — core glow (phase D).
   [animation: blast] A white-orange glow that blooms behind the planet
   as it spins up, right before the flash. */
import { makeGlowTexture } from '../../shared/textures.js';

var core, coreMat;

function init(ctx) {
  coreMat = new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,255,255,0.95)', 'rgba(255,160,70,0.5)'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  core = new THREE.Sprite(coreMat);
  core.renderOrder = 2;
  core.scale.setScalar(0.001);
  core.visible = false;
  ctx.scene.add(core);
}

function update(ctx) {
  var p = ctx.p, spin = ctx.spin;
  /* core glow behind the planet, growing with spin */
  core.visible = p >= 0.40 && p < 0.535;
  if (core.visible) {
    core.scale.setScalar(11 + 26 * spin);
    coreMat.opacity = 0.9 * spin;
  }
}

const coreglow = { init: init, update: update };

export default coreglow;
