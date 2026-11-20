/* Explore Beyond — animation 2: the blast.
   Story range 0.40-0.585 (phases D-E): the moon spins up under the
   core glow, cracks web open with heat, the camera shakes, then it
   detonates — white flash ping, 6000-particle fireball, expanding
   shockwave — and is gone before the first project card is born at
   0.585.
   Import this module to run the animation, or open run.html to scrub
   it standalone. */
import { config as C } from '../../config.js';
import planet from './planet.js';
import coreglow from './coreglow.js';
import fireball from './fireball.js';
import shockwave from './shockwave.js';
import flash from './flash.js';

var parts = [planet, coreglow, fireball, shockwave, flash];

const blast = {
  name: 'blast',
  range: C.RANGES.blast,
  parts: parts,

  init: function (ctx) {
    for (var i = 0; i < parts.length; i++) parts[i].init(ctx);
  },

  update: function (ctx) {
    for (var i = 0; i < parts.length; i++) parts[i].update(ctx);
  },

  resize: function (ctx) {
    for (var i = 0; i < parts.length; i++) if (parts[i].resize) parts[i].resize(ctx);
  }
};

export default blast;
