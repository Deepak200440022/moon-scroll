/* Explore Beyond — animation 4: the black hole.
   Story range 0.875-1.00 (phases G-I): the second supernova blooms
   where project 3 flew off (nova star + nova fireball + the second
   flash beat), the view snaps to the hole, and the exact-geodesic
   lensed particle world fades in into the interactive orbit page —
   accretion disk on Newtonian orbits, photons bent by RK4, the
   far side of the disk wrapped over the shadow, the EATEN counter,
   and the final name page.
   The cross-wiring lives here: the hole's onEaten callback feeds the
   final page's EATEN label (no globals, no circular imports).
   Import this module to run the animation, or open run.html to scrub
   it standalone (it ends live on the orbit page: drag to orbit,
   wheel-down zooms once the page can't scroll further, pinch on
   touch). */
import { config as C } from '../../config.js';
import star from './star.js';
import nova from './nova.js';
import flash from './flash.js';
import hole from './hole.js';
import lens from './lens.js';
import final from './final.js';

var parts = [star, nova, flash, hole, lens, final];

const blackhole = {
  name: 'blackhole',
  range: C.RANGES.blackhole,
  parts: parts,

  init: function (ctx) {
    star.init(ctx);
    nova.init(ctx);
    flash.init(ctx);
    final.init(ctx);
    hole.init(ctx, {
      onEaten: function (text) { final.setEaten(text); }
    });
    lens.init(ctx);
  },

  update: function (ctx) {
    for (var i = 0; i < parts.length; i++) parts[i].update(ctx);
  },

  resize: function (ctx) {
    nova.resize();
    hole.resize();
    lens.resize();
  },

  /* the finale pass: from p >= 0.91 the lensed world owns the screen
     (the stage calls this instead of rendering the story scene) */
  render: function (c) {
    lens.render(c);
  }
};

export default blackhole;
