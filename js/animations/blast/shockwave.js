/* Explore Beyond — shockwave (phase E).
   [animation: blast] A camera-facing ring that expands 0 -> 40 units
   and fades 1 -> 0 across the first beat of the explosion. */

var shock, shockMat;

function init(ctx) {
  shockMat = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uAlpha;',
      'varying vec2 vUv;',
      'void main() {',
      '  float d = length(vUv - 0.5) * 2.0;',
      '  float band = smoothstep(1.0, 0.94, d) * smoothstep(0.80, 0.88, d);',
      '  float fill = smoothstep(0.9, 0.0, d) * 0.12;',
      '  gl_FragColor = vec4(vec3(1.0, 0.96, 0.88), (band + fill) * uAlpha);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  shock = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shockMat);
  shock.frustumCulled = false;
  shock.renderOrder = 4;
  shock.visible = false;
  ctx.scene.add(shock);
}

function update(ctx) {
  var p = ctx.p, ex = ctx.ex;
  /* shockwave: expands 0 -> 40, alpha 1 -> 0 */
  shock.visible = p >= 0.535 && p <= 0.58;
  if (shock.visible) {
    shock.scale.setScalar(Math.max(40 * ex, 0.001));
    shockMat.uniforms.uAlpha.value = 1 - ex;
    shock.quaternion.copy(ctx.camera.quaternion);
  }
}

const shockwave = { init: init, update: update };

export default shockwave;
