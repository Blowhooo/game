// 3D 세상 + 픽셀 캐릭터 공용 뼈대(three.js). 글자 · 버튼은 위에 겹친 2D 화면(G.canvas)에 그린다.
//   G.start({...}) 다음에 G.w3d.init() → 장면 만들기 → draw 안에서 G.w3d.render(ctx)
//   G.w3d.ground(w, h)                 풀밭 바닥(2D판과 같은 그림) + 바깥 들판
//   G.w3d.box(x, y, z, w, h, d, mat)   상자(y는 바닥 높이). mat = G.tex3d.mat(...) 등
//   G.w3d.sprite('hero', 크기)          캐릭터 판 → .set(동작, 방향, 시간, fps) · .at(x, z, 높이) · .color(0xffffff) · .glow(0~1)
//   G.w3d.follow(x, z, 바로?)          카메라가 따라갈 곳.  G.w3d.pick(화면x, 화면y) → 바닥의 {x, z}
//   G.w3d.toScreen(x, y, z) → [화면x, 화면y]
// 좌표: 2D의 x → X, 2D의 y → Z, 높이 → Y. 1픽셀 = 1단위.
(function () {
  const W3 = (G.w3d = {});
  let renderer, scene, camera, sun;
  const camPos = new THREE.Vector3();
  const want = new THREE.Vector3();
  const faces = [];
  W3.pitch = 0.8; // 내려다보는 각도(0 옆, 1.57 바로 위)
  W3.dist = 560;

  W3.init = function (o = {}) {
    // 쓸 수 있는 그림을 미리 불러 둔다(다 불러진 뒤 첫 화면)
    for (const sh of Object.values(window.SHEETS || {})) G.img('../assets/' + sh.src);
    for (const n of ['tree_0.png', 'tree_1.png', 'rock_0.png', 'rock_1.png', 'bush_0.png']) G.img('../assets/' + n);
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const c3 = renderer.domElement;
    c3.style.position = 'fixed';
    document.body.insertBefore(c3, G.canvas);
    G.canvas.style.position = 'relative';
    G.canvas.style.zIndex = '1';

    scene = W3.scene = new THREE.Scene();
    const sky = new THREE.Color(o.sky || 0xa8c8dc);
    scene.background = sky;
    scene.fog = new THREE.Fog(sky, o.fogNear || 750, o.fogFar || 1600);
    camera = W3.camera = new THREE.PerspectiveCamera(o.fov || 30, G.W / G.H, 10, 5000);
    if (o.pitch) W3.pitch = o.pitch;
    if (o.dist) W3.dist = o.dist;

    scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6a6a50, 0.62));
    sun = new THREE.DirectionalLight(0xffe0b0, 0.55);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -520, right: 520, top: 520, bottom: -520, near: 10, far: 2000 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);
  };

  // 그림(Image)으로 질감 만들기: 아직 안 불러졌으면 불러진 뒤 올린다
  W3.texOf = function (img) {
    const t = new THREE.Texture(img);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    if (img.complete && img.naturalWidth) t.needsUpdate = true;
    else img.addEventListener('load', () => (t.needsUpdate = true));
    return t;
  };

  W3.ground = function (w, h, o = {}) {
    const can = G.ground.make(w, h, Object.assign({ seed: 3, deco: 0.01, patch: 0.02 }, o, { onDone: () => (t.needsUpdate = true) }));
    const t = new THREE.CanvasTexture(can);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(w / 2, 0, h / 2);
    m.receiveShadow = true;
    scene.add(m);
    // 바깥 들판(조금 어둡게)
    const out = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), G.tex3d.mat('grass', { repeat: [375, 375], color: 0xb0c090 }));
    out.rotation.x = -Math.PI / 2;
    out.position.set(w / 2, -0.5, h / 2);
    out.receiveShadow = true;
    scene.add(out);
    return m;
  };

  W3.box = function (x, y, z, w, h, d, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  };

  // 세운 판(나무 · 캐릭터): 아래쪽이 원점, 카메라를 바라본다
  W3.billboard = function (baseTex, w, h, rx, ry, parent) {
    const t = baseTex.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = baseTex.image && baseTex.image.complete;
    if (baseTex.image && !baseTex.image.complete) baseTex.image.addEventListener('load', () => (t.needsUpdate = true));
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    const mat = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
    faces.push(m);
    (parent || scene).add(m);
    return m;
  };

  const imgTex = {};
  W3.imageTex = (src) => (imgTex[src] = imgTex[src] || W3.texOf(G.img(src)));

  // 나무 한 그루(길가식당 나무 그림)
  W3.tree = function (x, z, s = 2, which = 0) {
    const m = W3.billboard(W3.imageTex('../assets/tree_' + which + '.png'), 32 * s, 48 * s, 1, 1);
    m.position.set(x, 0, z);
    return m;
  };

  // 캐릭터 판
  const NEAR = { south: ['south-east', 'south-west'], north: ['north-east', 'north-west'], east: ['south-east', 'north-east'], west: ['south-west', 'north-west'], 'south-east': ['east', 'south'], 'south-west': ['west', 'south'], 'north-east': ['east', 'north'], 'north-west': ['west', 'north'] };
  W3.sprite = function (name, scale = 1) {
    const sh = SHEETS[name];
    const img = G.img('../assets/' + sh.src);
    const base = W3.imageTex('../assets/' + sh.src);
    const size = sh.cell * scale;
    const iw = () => img.naturalWidth || sh.cell;
    const ih = () => img.naturalHeight || sh.cell;
    const m = W3.billboard(base, size, size, 1, 1);
    const sp = { mesh: m };
    sp.set = function (anim, dir, t = 0, fps = 8) {
      let info;
      for (const a of [anim, 'stand']) {
        const set = sh.anims[a];
        if (!set) continue;
        info = set[dir] || (NEAR[dir] || []).map((d) => set[d]).find(Boolean);
        if (info) break;
      }
      info = info || Object.values(sh.anims.stand)[0];
      const [row, n] = info;
      const f = Math.floor(t * fps) % n;
      m.material.map.repeat.set(sh.cell / iw(), sh.cell / ih());
      m.material.map.offset.set((f * sh.cell) / iw(), 1 - ((row + 1) * sh.cell) / ih());
      return sp;
    };
    sp.at = (x, z, y = 0) => (m.position.set(x, y, z), sp);
    sp.color = (hex) => (m.material.color.set(hex), sp);
    sp.glow = (v, r = 1, g = 1, b = 1) => (m.material.emissive.setRGB(v * r, v * g, v * b), sp);
    sp.remove = () => {
      m.parent && m.parent.remove(m);
      faces.splice(faces.indexOf(m), 1);
    };
    sp.set('stand', 'south');
    return sp;
  };

  W3.follow = function (x, z, instant) {
    want.set(x, Math.sin(W3.pitch) * W3.dist, z + Math.cos(W3.pitch) * W3.dist);
    if (instant || !camPos.lengthSq()) camPos.copy(want);
  };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitP = new THREE.Vector3();
  W3.pick = function (sx, sy, height = 0) {
    ndc.set((sx / G.W) * 2 - 1, -((sy / G.H) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    floor.constant = -height;
    return ray.ray.intersectPlane(floor, hitP) ? { x: hitP.x, z: hitP.z } : null;
  };

  const v = new THREE.Vector3();
  W3.toScreen = function (x, y, z) {
    v.set(x, y, z).project(camera);
    return [((v.x + 1) / 2) * G.W, ((1 - v.y) / 2) * G.H];
  };

  W3.render = function (ctx) {
    const r = G.canvas.getBoundingClientRect();
    const c3 = renderer.domElement;
    if (c3._w !== r.width || c3._h !== r.height) {
      renderer.setPixelRatio(devicePixelRatio || 1);
      renderer.setSize(r.width, r.height, false);
      c3.style.width = r.width + 'px';
      c3.style.height = r.height + 'px';
      c3._w = r.width;
      c3._h = r.height;
    }
    c3.style.left = r.left + 'px';
    c3.style.top = r.top + 'px';

    camPos.lerp(want, 0.12);
    const [sx, sy] = G.fx ? G.fx.shakeOffset() : [0, 0];
    const back = Math.cos(W3.pitch) * W3.dist;
    camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z);
    camera.lookAt(camPos.x + sx, sy, camPos.z - back);
    sun.position.set(camPos.x - 220, 480, camPos.z - back + 60 + 200);
    sun.target.position.set(camPos.x, 0, camPos.z - back);
    for (const m of faces) m.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, G.W, G.H);
  };
})();
