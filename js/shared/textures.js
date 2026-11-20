/* Explore Beyond — canvas-drawn sprite textures shared by the phase modules. */

// soft radial glow (the core, the nova star, the black hole halo)
export function makeGlowTexture(inner, mid) {
  var c = document.createElement('canvas'); c.width = 256; c.height = 256;
  var ctx = c.getContext('2d');
  var g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, mid);
  g.addColorStop(1, 'rgba(215,225,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// nebula sprites for the lensable world behind the black hole
export function makeNebulaTexture(stops) {
  var c = document.createElement('canvas'); c.width = 256; c.height = 256;
  var ctx = c.getContext('2d');
  var g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (var s = 0; s < stops.length; s++) g.addColorStop(stops[s][0], stops[s][1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
