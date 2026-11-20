/* One-shot fidelity check: every GLSL string in the refactored modules
   must be byte-identical (whitespace-normalized) to the original
   monolith in index.html.bak. Run: node test/shader-diff.js */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const bak = fs.readFileSync(path.join(ROOT, 'index.html.bak'), 'utf8');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const files = {
  dither: read('js/shared/dither.js'),
  shock: read('js/animations/blast/shockwave.js'),
  fire: read('js/animations/blast/fireball.js'),
  dust: read('js/animations/shards/dust.js'),
  hole: read('js/animations/blackhole/hole.js'),
  lens: read('js/animations/blackhole/lens.js'),
  planet: read('js/animations/blast/planet.js')
};

function capture(src, varAnchor, key) {
  const vs = src.indexOf(varAnchor);
  if (vs < 0) return null;
  const k = src.indexOf(key, vs);
  if (k < 0 || k - vs > 4000) return null;
  const start = src.indexOf('[', k);
  const end = src.indexOf("].join('\\n')", start);
  if (start < 0 || end < 0) return null;
  return src.slice(start + 1, end).split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

function captureBareArray(src, anchor) {
  const i = src.indexOf(anchor);
  if (i < 0) return null;
  const s = src.indexOf('[', i);
  const e = src.indexOf("].join('\\n')", s);
  if (s < 0 || e < 0) return null;
  return src.slice(s + 1, e).split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

let fails = 0;
function cmp(label, aBak, bNew) {
  const ok = aBak !== null && bNew !== null && aBak === bNew;
  const why = aBak === null ? '(not found in bak)' : bNew === null ? '(not found in new file)' : ok ? '' : '(differs)';
  console.log((ok ? 'ok  ' : 'FAIL ') + label + ' ' + why);
  if (!ok && aBak !== null && bNew !== null) {
    const A = aBak.split('\n');
    const B = bNew.split('\n');
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (A[i] !== B[i]) {
        console.log('  first diff at line ' + (i + 1) + ':');
        console.log('  bak : ' + JSON.stringify(A[i]));
        console.log('  new : ' + JSON.stringify(B[i]));
        break;
      }
    }
    fails++;
  } else if (!ok) {
    fails++;
  }
}

const pairs = [
  ['dither vertex', 'var ditherMat = new THREE.ShaderMaterial', 'vertexShader: [', 'dither', 'ditherMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['dither fragment', 'var ditherMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'dither', 'ditherMat = new THREE.ShaderMaterial', 'fragmentShader: ['],
  ['shockwave vertex', 'var shockMat = new THREE.ShaderMaterial', 'vertexShader: [', 'shock', 'shockMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['shockwave fragment', 'var shockMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'shock', 'shockMat = new THREE.ShaderMaterial', 'fragmentShader: ['],
  ['dust vertex', 'var dustMat = new THREE.ShaderMaterial', 'vertexShader: [', 'dust', 'dustMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['dust fragment', 'var dustMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'dust', 'dustMat = new THREE.ShaderMaterial', 'fragmentShader: ['],
  ['bh disk vertex', 'var bhMat = new THREE.ShaderMaterial', 'vertexShader: [', 'hole', 'bhMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['bh disk fragment', 'var bhMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'hole', 'bhMat = new THREE.ShaderMaterial', 'fragmentShader: ['],
  ['bh stars vertex', 'var bhStarMat = new THREE.ShaderMaterial', 'vertexShader: [', 'hole', 'bhStarMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['bh stars fragment', 'var bhStarMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'hole', 'bhStarMat = new THREE.ShaderMaterial', 'fragmentShader: ['],
  ['swirl vertex', 'var swMat = new THREE.ShaderMaterial', 'vertexShader: [', 'hole', 'swMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['swirl fragment', 'var swMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'hole', 'swMat = new THREE.ShaderMaterial', 'fragmentShader: ['],
  ['lens vertex', 'var lensMat = new THREE.ShaderMaterial', 'vertexShader: [', 'lens', 'lensMat = new THREE.ShaderMaterial', 'vertexShader: ['],
  ['lens GEODESIC fragment', 'var lensMat = new THREE.ShaderMaterial', 'fragmentShader: [', 'lens', 'lensMat = new THREE.ShaderMaterial', 'fragmentShader: [']
];
for (const [label, bAnchor, bKey, f, nAnchor, nKey] of pairs) {
  cmp(label, capture(bak, bAnchor, bKey), capture(files[f], nAnchor, nKey));
}
cmp('fireball vertex (fbVert)', captureBareArray(bak, 'var fbVert = ['), captureBareArray(files.fire, 'fbVert = ['));
cmp('fireball fragment (fbFrag)', captureBareArray(bak, 'var fbFrag = ['), captureBareArray(files.fire, 'fbFrag = ['));
cmp('planet heat injection', captureBareArray(bak, ".replace('uniform vec3 emissive;', ["), captureBareArray(files.planet, ".replace('uniform vec3 emissive;', ["));
cmp('planet crack emission', captureBareArray(bak, ".replace('#include <emissivemap_fragment>', ["), captureBareArray(files.planet, ".replace('#include <emissivemap_fragment>', ["));

console.log(fails === 0 ? '\nAll shader strings identical to the original.' : '\n' + fails + ' shader diff(s) remain.');
process.exit(fails ? 1 : 0);
