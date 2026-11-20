/* Explore Beyond — the space station (phases A-B).
   [animation: zoom] Corridor interior with the big round porthole you
   start inside of, looking out at the planet. Hidden the moment the
   station is left. */

var stationGroup;

function init(ctx) {
  stationGroup = new THREE.Group();
  var hullMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.8 });
  var frameMat = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.35, metalness: 0.9 });
  var boltMat = new THREE.MeshStandardMaterial({ color: 0x7d8590, roughness: 0.35, metalness: 1.0 });
  var podMat = new THREE.MeshStandardMaterial({ color: 0x33373e, roughness: 0.9, metalness: 0.15 });
  var stripMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e13,
    emissive: 0xf2f4f8,
    emissiveIntensity: 2.2,
    roughness: 0.4,
    metalness: 0.2
  });

  function addMesh(geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    stationGroup.add(m);
    return m;
  }

  // Corridor from z = +4 to z = -2 (interior 8 wide, 5 tall).
  addMesh(new THREE.BoxGeometry(8.4, 0.3, 6.6), hullMat, 0, -2.65, 1);   // floor
  addMesh(new THREE.BoxGeometry(8.4, 0.3, 6.6), hullMat, 0, 2.65, 1);    // ceiling
  addMesh(new THREE.BoxGeometry(0.3, 5.3, 6.6), hullMat, -4.15, 0, 1);   // left wall
  addMesh(new THREE.BoxGeometry(0.3, 5.3, 6.6), hullMat, 4.15, 0, 1);    // right wall

  // Front wall at z ~ -2 with a big round porthole (the "eclipse" disc).
  var POHOLE_R = 1.9;
  var wallShape = new THREE.Shape();
  wallShape.moveTo(-4, -2.5);
  wallShape.lineTo(4, -2.5);
  wallShape.lineTo(4, 2.5);
  wallShape.lineTo(-4, 2.5);
  wallShape.closePath();
  var wallHole = new THREE.Path();
  wallHole.absarc(0, 0, POHOLE_R, 0, Math.PI * 2, true);
  wallShape.holes.push(wallHole);
  addMesh(new THREE.ExtrudeGeometry(wallShape, { depth: 0.3, bevelEnabled: false }), hullMat, 0, 0, -2.15);

  // Porthole ring frame (catches light -> bright rim arc) + bolts.
  addMesh(new THREE.TorusGeometry(POHOLE_R, 0.16, 20, 96), frameMat, 0, 0, -1.9);
  addMesh(new THREE.TorusGeometry(3.1, 0.05, 10, 96), frameMat, 0, 0, -1.82); // concentric detail ring
  var boltGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12);
  for (var bi = 0; bi < 12; bi++) {
    var ba = bi * Math.PI / 6;
    var bolt = addMesh(boltGeo, boltMat, Math.cos(ba) * POHOLE_R, Math.sin(ba) * POHOLE_R, -1.7);
    bolt.rotation.x = Math.PI / 2;
  }

  // Relief details on the wall (dither into texture).
  addMesh(new THREE.BoxGeometry(0.5, 0.3, 0.08), podMat, -3.2, 1.9, -1.82);
  addMesh(new THREE.BoxGeometry(0.5, 0.3, 0.08), podMat, 3.2, 1.9, -1.82);
  addMesh(new THREE.BoxGeometry(0.5, 0.3, 0.08), podMat, -3.2, -1.9, -1.82);
  addMesh(new THREE.BoxGeometry(0.5, 0.3, 0.08), podMat, 3.2, -1.9, -1.82);
  addMesh(new THREE.BoxGeometry(0.12, 4.6, 0.1), podMat, -3.8, 0, -1.82);
  addMesh(new THREE.BoxGeometry(0.12, 4.6, 0.1), podMat, 3.8, 0, -1.82);

  // Soft volume shapes that dither into an organic field.
  addMesh(new THREE.SphereGeometry(1.15, 48, 48), podMat, -3.1, -1.2, -0.8);
  addMesh(new THREE.SphereGeometry(0.9, 48, 48), podMat, 3.0, 1.5, -1.0);
  addMesh(new THREE.BoxGeometry(1.7, 0.9, 0.6), podMat, 2.2, -1.7, -0.8);

  // Emissive strips.
  addMesh(new THREE.BoxGeometry(1.6, 0.06, 0.14), stripMat, -1.7, 2.47, -0.9);
  addMesh(new THREE.BoxGeometry(1.6, 0.06, 0.14), stripMat, 1.7, 2.47, -0.9);
  addMesh(new THREE.BoxGeometry(1.6, 0.06, 0.14), stripMat, 0, 2.47, 1.7);

  var corridorLight = new THREE.PointLight(0xf5f7fa, 8, 12, 2);
  corridorLight.position.set(0, 1.5, 0.6);
  stationGroup.add(corridorLight);

  ctx.scene.add(stationGroup);
}

function update(ctx) {
  // hidden for the rest of the story once B ends: the camera later dollies
  // back past the corridor to frame the planet at the origin, so a
  // camera-z test would re-show the station from behind
  stationGroup.visible = ctx.p < 0.16;
}

const station = { init: init, update: update };

export default station;
