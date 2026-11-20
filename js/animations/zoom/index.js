/* Explore Beyond — animation 1: the zoom.
   Story range 0.00-0.40 (phases A-C): you start inside the station,
   the camera dollies out through the porthole and frames the planet
   until it fills the view. Everything here is a pure function of the
   story progress; the shared story camera (shared/camera.js) does the
   dolly, and the moon itself is owned by the blast animation
   (blast/planet.js) — it is imported there only so this run has
   something to frame.
   Import this module to run the animation, or open run.html to scrub
   it standalone. */
import { config as C } from '../../config.js';
import station from './station.js';
import panels from './panels.js';

var parts = [station, panels];

const zoom = {
  name: 'zoom',
  range: C.RANGES.zoom,
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

export default zoom;
