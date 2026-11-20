/* Shared headless stubs: a minimal DOM + a three.js stub, just enough
   to load and drive the real modules under Node. Used by
   test/smoke.js (the full story) and test/standalone.js
   (the per-animation run pages). */
'use strict';

/* ------------------------------------------------ minimal DOM */
function makeElement(tag) {
  return {
    tagName: tag,
    style: {},
    children: [],
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    textContent: '',
    innerHTML: '',
    appendChild(ch) { this.children.push(ch); return ch; },
    addEventListener() {},
    contains() { return false; },
    getAttribute() { return null; },
    setAttribute() {},
    offsetWidth: 300,
    offsetHeight: 200,
    closest() { return null; },
    href: '',
    target: '',
    rel: '',
    className: ''
  };
}

function makeCanvas() {
  const el = makeElement('canvas');
  el.width = 0;
  el.height = 0;
  el.getContext = (kind) => {
    if (kind !== '2d') return null;
    const grad = { addColorStop() {} };
    return {
      createRadialGradient: () => grad,
      createLinearGradient: () => grad,
      fillRect() {},
      clearRect() {},
      drawImage() {},
      strokeRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      rect() {},
      clip() {},
      save() {},
      restore() {},
      stroke() {},
      fill() {},
      fillText() {},
      measureText: () => ({ width: 50 }),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: ''
    };
  };
  return el;
}

/* ------------------------------------------------ three.js stub */
function V3(x = 0, y = 0, z = 0) {
  return {
    x, y, z,
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
    setScalar(s) { this.x = s; this.y = s; this.z = s; return this; },
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; },
    project() { return this; }
  };
}
function Q() {
  return {
    x: 0, y: 0, z: 0, w: 1,
    setFromAxisAngle() { return this; },
    copy() { return this; }
  };
}
function posAttr(n) {
  return {
    count: n,
    array: new Float32Array(n * 3),
    getX(i) { return i * 0.113 - 0.5; },
    getY(i) { return i * 0.071 - 0.3; },
    getZ(i) { return i * 0.037 - 0.2; },
    setXYZ() {},
    needsUpdate: false
  };
}
function base3d() {
  return {
    position: V3(),
    rotation: { x: 0, y: 0, z: 0 },
    scale: V3(1, 1, 1),
    quaternion: Q(),
    visible: true,
    renderOrder: 0,
    frustumCulled: true,
    userData: {},
    matrix: { copy() { return this; } },
    children: [],
    add(o) { this.children.push(o); return o; },
    updateMatrix() { return this; },
    getWorldPosition(v) { return v.set(0, 0, 0); },
    lookAt() {},
    rotateZ() {}
  };
}
function mat(props) { return Object.assign({ uniforms: {} }, props || {}); }
function geoWithPos(n) {
  return { attributes: { position: posAttr(n) }, computeVertexNormals() {} };
}

function makeTHREE() {
  return {
    SRGBColorSpace: 'srgb',
    LinearFilter: 1001,
    AdditiveBlending: 2,
    DoubleSide: 2,
    DynamicDrawUsage: 35048,
    ACESFilmicToneMapping: 6,
    Vector2: function (x = 0, y = 0) {
      return { x, y, set(x, y) { this.x = x; this.y = y; return this; } };
    },
    Vector3: V3,
    Quaternion: Q,
    Matrix4: function () { return { copy() { return this; } }; },
    Object3D: function () { return base3d(); },
    Mesh: function (g, m) { const o = base3d(); o.geometry = g; o.material = m; return o; },
    Points: function (g, m) { const o = base3d(); o.geometry = g; o.material = m; return o; },
    Sprite: function (m) { const o = base3d(); o.material = m; return o; },
    Group: function () { return base3d(); },
    LineSegments: function (g, m) { const o = base3d(); o.geometry = g; o.material = m; return o; },
    Scene: function () { const o = base3d(); o.background = null; return o; },
    InstancedMesh: function (g, m, n) {
      const o = base3d();
      o.geometry = g; o.material = m; o.count = n;
      o.instanceMatrix = { setUsage() {}, needsUpdate: false };
      o.setMatrixAt = () => {};
      return o;
    },
    PerspectiveCamera: function (fov, aspect, near, far) {
      const o = base3d();
      o.fov = fov; o.aspect = aspect; o.near = near; o.far = far;
      o.matrixWorld = { copy() { return this; } };
      o.updateProjectionMatrix = () => {};
      o.updateMatrixWorld = () => {};
      return o;
    },
    OrthographicCamera: function () { return base3d(); },
    WebGLRenderer: function () {
      return {
        setPixelRatio() {},
        setSize() {},
        setRenderTarget() {},
        render() {},
        capabilities: { getMaxAnisotropy: () => 16 },
        outputColorSpace: null,
        toneMapping: 0,
        toneMappingExposure: 1
      };
    },
    PlaneGeometry: function () { return {}; },
    BoxGeometry: function () { return geoWithPos(64); },
    SphereGeometry: function () { return geoWithPos(32); },
    TorusGeometry: function () { return {}; },
    CylinderGeometry: function () { return {}; },
    IcosahedronGeometry: function () { return geoWithPos(12); },
    EdgesGeometry: function () { return {}; },
    ExtrudeGeometry: function () { return {}; },
    Shape: function () { return { moveTo() {}, lineTo() {}, closePath() {}, holes: [] }; },
    Path: function () { return { absarc() {} }; },
    BufferGeometry: function () {
      return {
        attributes: {},
        setAttribute(n, a) { this.attributes[n] = a; return a; },
        computeVertexNormals() {}
      };
    },
    BufferAttribute: function (arr, itemSize) {
      return {
        array: arr,
        itemSize: itemSize,
        count: Math.max(0, Math.floor(arr.length / itemSize)),
        setUsage() { return this; },
        needsUpdate: false
      };
    },
    MeshStandardMaterial: mat,
    MeshBasicMaterial: mat,
    PointsMaterial: mat,
    SpriteMaterial: mat,
    LineBasicMaterial: mat,
    ShaderMaterial: mat,
    CanvasTexture: function (canvas) { return { image: canvas, colorSpace: null, anisotropy: 1 }; },
    DataTexture: function () { return {}; },
    Color: function (hex) { return { hex: hex }; },
    WebGLRenderTarget: function (w, h) {
      return { width: w, height: h, texture: {}, setSize(w, h) { this.width = w; this.height = h; } };
    },
    Raycaster: function () {
      return { setFromCamera() {}, intersectObjects() { return []; } };
    },
    Clock: function () { return { getDelta: () => 0.016 }; },
    DirectionalLight: function (c, i) {
      return { color: c, intensity: i, position: V3(), target: { position: V3() } };
    },
    AmbientLight: function (c, i) { return { color: c, intensity: i }; },
    PointLight: function () { return { position: V3() }; }
  };
}

/* ------------------------------------------------ boot the stubs */
function setup() {
  const winListeners = {};
  global.window = global;
  window.innerWidth = 1280;
  window.innerHeight = 800;
  window.devicePixelRatio = 2;
  window.scrollY = 0;
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.addEventListener = (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); };
  window.__raf = null;
  window.requestAnimationFrame = (cb) => { window.__raf = cb; return 1; };
  window.cancelAnimationFrame = () => {};

  const elements = {};
  [
    'scroll-space', 'scene', 'nav', 'final', 'final-inner', 'final-tag',
    'final-tag-text', 'final-name', 'final-sub', 'final-btns', 'final-hint',
    'eaten', 'ui', 'progress', 'hero', 'corner', 'hint', 'card', 'card-inner',
    'card-name', 'card-desc', 'card-tags', 'card-link', 'flash', 'fallback'
  ].forEach((id) => { elements[id] = id === 'scene' ? makeCanvas() : makeElement('div'); });

  global.document = {
    body: { scrollHeight: 14000, style: {} },
    getElementById: (id) => elements[id] || (elements[id] = makeElement('div')),
    createElement: (tag) => (tag === 'canvas' ? makeCanvas() : makeElement(tag)),
    querySelectorAll: () => [],
    addEventListener() {}
  };
  window.document = document;

  const THREE = makeTHREE();
  window.THREE = THREE; // the page loads three.js from a CDN, which sets window.THREE

  return {
    elements: elements,
    THREE: THREE,
    fireScroll: () => (winListeners['scroll'] || []).forEach((fn) => fn({})),
    /* the raw input events the park gate listens for (they fire even
       at the bottom of the page, where no scroll position is left) */
    fireWheel: (deltaY) => (winListeners['wheel'] || []).forEach((fn) => fn({ deltaY: deltaY, preventDefault() {} })),
    fireTouchStart: (y) => (winListeners['touchstart'] || []).forEach((fn) => fn({ touches: [{ clientX: 0, clientY: y }], preventDefault() {} })),
    fireTouchMove: (y) => (winListeners['touchmove'] || []).forEach((fn) => fn({ touches: [{ clientX: 0, clientY: y }], preventDefault() {} })),
    fireTouchEnd: () => (winListeners['touchend'] || []).forEach((fn) => fn({})),
    fireKey: (key) => (winListeners['keydown'] || []).forEach((fn) => fn({ key: key })),
    maxScroll: document.body.scrollHeight - window.innerHeight
  };
}

module.exports = { setup: setup };
