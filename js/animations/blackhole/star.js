/* Explore Beyond — the second star (phase G).
   [animation: blackhole] The nova at z = -120 that blooms as project
   3 flows off into the second supernova / black hole transition. Its
   fireball lives in this folder's nova.js (which reuses the blast's
   shared fireball system). */
import { M } from '../../shared/math.js';
import { makeGlowTexture } from '../../shared/textures.js';

var starSpr, starSprMat;

function init(ctx) {
  starSprMat = new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,255,255,1)', 'rgba(190,215,255,0.6)'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  starSpr = new THREE.Sprite(starSprMat);
  starSpr.position.set(0, 0, -120);
  starSpr.scale.setScalar(0.001);
  starSpr.visible = false;
  ctx.scene.add(starSpr);
}

function update(ctx) {
  var p = ctx.p;
  /* star (second supernova) — blooms as P3 flows off (S4) */
  starSpr.visible = p >= 0.875 && p < 0.91;
  if (starSpr.visible) {
    var gk = M.easeIn(M.phase(0.875, 0.905, p));
    starSpr.scale.setScalar(Math.max(60 * gk, 0.001));
    starSprMat.opacity = gk;
  }
}

const star = { init: init, update: update };

export default star;
