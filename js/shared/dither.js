/* Explore Beyond — dither post pass.
   1-bit Bayer dither for the story (A-G); blends to full color when the
   black hole takes over (H-I) so the final page keeps the original
   colorful look of the raymarched Schwarzschild shader.
   Main renders the scene into `rt`, then blits it through this pass. */

var rt, postScene, postCam, ditherMat;

function init(pixelRatio) {
  rt = new THREE.WebGLRenderTarget(
    Math.max(2, Math.floor(window.innerWidth * pixelRatio)),
    Math.max(2, Math.floor(window.innerHeight * pixelRatio)),
    { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
  );

  postScene = new THREE.Scene();
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  ditherMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: rt.texture },
      uColorMix: { value: 0 }
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = vec4(position.xy, 0.0, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float uColorMix;',
      'varying vec2 vUv;',
      'float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }',
      'float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }',
      'float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer4(a); }',
      'void main() {',
      '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
      '  // scene pixels are linear; the black hole is pre-gamma. Blend the exponent.',
      '  float g = mix(1.0 / 2.2, 1.0, uColorMix);',
      '  c = pow(max(c, 0.0), vec3(g));',
      '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
      '  if (l < 0.01) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; } // empty space stays pure black',
      '  float b = bayer8(gl_FragCoord.xy * 0.5);',
      '  float v = step(b, l + 1.0 / 64.0);',
      '  gl_FragColor = vec4(mix(vec3(v), c, uColorMix), 1.0);',
      '}'
    ].join('\n'),
    depthTest: false,
    depthWrite: false
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

  dither.rt = rt;
  dither.postScene = postScene;
  dither.postCam = postCam;
}

function resize(pixelRatio) {
  rt.setSize(
    Math.max(2, Math.floor(window.innerWidth * pixelRatio)),
    Math.max(2, Math.floor(window.innerHeight * pixelRatio))
  );
}

function setMix(v) { ditherMat.uniforms.uColorMix.value = v; }

const dither = { init: init, resize: resize, setMix: setMix };

export { dither };
