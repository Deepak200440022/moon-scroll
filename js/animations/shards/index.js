/* Explore Beyond — animation 3: the shards.
   Story range 0.585-0.89 (phase F): the exploded planet is now a
   stream of shards flowing past the camera; one project slab at a
   time bursts in, parks for the viewing zone, and flies off, with the
   info card following the active shard.
   The cross-wiring lives here (not in the parts): the card reads the
   shard meshes directly, and the shard stream gets the card's hover
   state injected via getActive — so the two modules never import
   each other.
   Import this module to run the animation, or open run.html to scrub
   it standalone. */
import { config as C } from '../../config.js';
import dust from './dust.js';
import shards from './shards.js';
import card from './card.js';

var parts = [dust, shards, card];

const shardsAnim = {
  name: 'shards',
  range: C.RANGES.shards,
  parts: parts,
  // handles the main page (and the tests) reach through this entry:
  card: card,
  stream: shards,

  init: function (ctx) {
    dust.init(ctx);
    card.init(ctx);
    shards.init(ctx, {
      getActive: function () { return card.activeIndex(); }
    });
  },

  update: function (ctx) {
    for (var i = 0; i < parts.length; i++) parts[i].update(ctx);
  },

  resize: function (ctx) {
    dust.resize();
    card.refreshSize();
  }
};

export default shardsAnim;
