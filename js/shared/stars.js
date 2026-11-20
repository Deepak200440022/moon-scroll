/* Explore Beyond — background starfield (phases A-H).
   Fades to a faint field once the planet takes the center, hidden once the
   black hole world takes over. Persistent world object: the main page and
   every standalone animation run keep it as the shared backdrop. */
import { M } from './math.js';
import { random } from './random.js';

var stars, starsMat;

function makeStars(count, seed, size, maxOpacity) {
  var pos = new Float32Array(count * 3);
  var col = new Float32Array(count * 3);
  var rand = random.mulberry32(seed);
  for (var i = 0; i < count; i++) {
    var u = rand() * 2 - 1;
    var ang = rand() * Math.PI * 2;
    var s = Math.sqrt(1 - u * u);
    var r = 200 + 200 * rand();
    pos[i * 3] = s * Math.cos(ang) * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = s * Math.sin(ang) * r;
    var b = 0.22 + 0.78 * Math.pow(rand(), 2);
    var tint = rand();
    col[i * 3] = b * (0.82 + 0.18 * tint);
    col[i * 3 + 1] = b * (0.86 + 0.14 * tint);
    col[i * 3 + 2] = b;
  }
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  var m = new THREE.PointsMaterial({
    size: size,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: maxOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  return new THREE.Points(g, m);
}

function init(ctx) {
  stars = makeStars(4000, 9001, 1.2, 1.0);
  starsMat = stars.material;
  ctx.scene.add(stars);
}

function update(ctx) {
  // 1 -> 0.15 over 0.30-0.40, then held faint
  starsMat.opacity = 1 - 0.85 * M.phase(0.30, 0.40, ctx.p);
  stars.visible = ctx.p < 0.91;
}

const starsModule = { init: init, update: update };

export default starsModule;
