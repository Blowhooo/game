// 맛보기 ①-3D · 실시간 액션을 3D 세상 + 2D 픽셀 캐릭터로 그리기(HD-2D 느낌).
// 규칙은 ../action/logic.js 를 그대로 쓴다. 글자 · 막대는 ../action/hud.js 를 겹친 2D 화면에.
// 좌표: 2D 월드의 x → 3D X, 2D 월드의 y → 3D Z, 높이 = 3D Y. 1픽셀 = 1단위.
(function () {
  const { W, H, WORLD, stats, weaponColor, telegraphing } = ACT;
  const I = G.input;
  let scene, camera, renderer, sun, groundTex;
  const meshes = new Map(); // 사람(2D 상태 객체) → 판
  const fxMeshes = []; // 이번 프레임에 쓴 베기 · 예고 · 탄(매 프레임 다시 만듦)
  const camPos = new THREE.Vector3();
  const PITCH = 0.72; // 내려다보는 각도(라디안, 0이면 옆에서, 1.57이면 바로 위에서)
  const DIST = 540;

  // 쓸 그림을 미리 불러 둔다(다 불러진 뒤에 첫 화면을 그림)
  for (const n of ['grass_base.png', 'forest_floor_0.png', 'tree_0.png', 'tree_1.png', SHEETS.hero.src, SHEETS.man.src]) G.img('../assets/' + n);

  function tex(name) {
    const t = new THREE.Texture(G.img('../assets/' + name));
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }

  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const c3 = renderer.domElement;
    c3.style.position = 'fixed';
    c3.style.imageRendering = 'pixelated';
    document.body.insertBefore(c3, G.canvas);
    G.canvas.style.position = 'relative';
    G.canvas.style.zIndex = '1';

    scene = new THREE.Scene();
    const sky = new THREE.Color(0xa8c8dc);
    scene.background = sky;
    scene.fog = new THREE.Fog(sky, 620, 1300);
    camera = new THREE.PerspectiveCamera(30, W / H, 10, 3000);

    scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6a6a50, 0.62));
    sun = new THREE.DirectionalLight(0xffe0b0, 0.55);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 1600 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    // 싸우는 바닥: 2D판과 같은 풀밭 그림
    const gcan = G.ground.make(WORLD.w, WORLD.h, { seed: 3, deco: 0.015, patch: 0.02, onDone: () => (groundTex.needsUpdate = true) });
    groundTex = new THREE.CanvasTexture(gcan);
    groundTex.magFilter = groundTex.minFilter = THREE.NearestFilter;
    groundTex.generateMipmaps = false;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.w, WORLD.h), new THREE.MeshLambertMaterial({ map: groundTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(WORLD.w / 2, 0, WORLD.h / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // 바깥: 한 단 높은 언덕(가장자리 벽) + 나무 · 바위
    const grassT = tex('grass_base.png');
    grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping;
    const dirtT = tex('forest_floor_0.png');
    dirtT.wrapS = dirtT.wrapT = THREE.RepeatWrapping;
    function cliff(x, z, w, d, h) {
      const top = grassT.clone();
      top.repeat.set(w / 16, d / 16);
      top.needsUpdate = true;
      const side = dirtT.clone();
      side.repeat.set(Math.max(w, d) / 16, h / 16);
      side.needsUpdate = true;
      const ms = new THREE.MeshLambertMaterial({ map: side, color: 0xe8d4b8 });
      const mt = new THREE.MeshLambertMaterial({ map: top });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [ms, ms, mt, ms, ms, ms]);
      m.position.set(x + w / 2, h / 2, z + d / 2);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }
    const B = 400; // 바깥 폭
    cliff(-B, -B, WORLD.w + B * 2, B, 34); // 위
    cliff(-B, 0, B, WORLD.h, 34); // 왼쪽
    cliff(WORLD.w, 0, B, WORLD.h, 34); // 오른쪽
    cliff(-B, WORLD.h, WORLD.w + B * 2, B, 6); // 아래(카메라 쪽은 낮게)

    // 나무: 세운 판(그림자 있음). 위 · 옆 언덕 위에
    const trees = [tex('tree_0.png'), tex('tree_1.png')];
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const treeSpots = [];
    for (let x = -80; x < WORLD.w + 80; x += 34) treeSpots.push([x + rnd() * 20, -20 - rnd() * 60, 34]);
    for (let z = 20; z < WORLD.h; z += 40) {
      treeSpots.push([-20 - rnd() * 50, z + rnd() * 20, 34]);
      treeSpots.push([WORLD.w + 20 + rnd() * 50, z + rnd() * 20, 34]);
    }
    for (const [x, z, y] of treeSpots) {
      const t = trees[Math.floor(rnd() * 2)];
      const s = 1.8 + rnd() * 0.8;
      const m = billboard(t, 32 * s, 48 * s, 1, 1, 0, 0);
      m.position.set(x, y, z);
      m.userData.face = true;
      scene.add(m);
    }
    // 싸움터 안 바위 몇 개(장식, 부딪히지는 않음)
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + rnd() * 6, 0), new THREE.MeshLambertMaterial({ color: 0x8a8f96, flatShading: true }));
      m.position.set(40 + rnd() * (WORLD.w - 80), 3, 60 + rnd() * (WORLD.h - 100));
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }
  }

  // 세운 판 하나(그림 일부를 보여 줌). 발이 바닥에 닿게 아래쪽이 원점
  function billboard(baseTex, w, h, rx, ry, ox, oy) {
    const t = baseTex.clone();
    t.repeat.set(rx, ry);
    t.offset.set(ox, oy);
    t.needsUpdate = true;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    const mat = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
    return m;
  }

  // ── 캐릭터 판: 2D와 같은 그림판(SHEETS)에서 프레임을 골라 보여 줌
  const sheetTex = {};
  function charMesh(name, scale) {
    const sh = SHEETS[name];
    if (!sheetTex[name]) sheetTex[name] = tex(sh.src);
    const img = G.img('../assets/' + sh.src);
    const m = billboard(sheetTex[name], sh.cell * scale, sh.cell * scale, sh.cell / img.naturalWidth, sh.cell / img.naturalHeight, 0, 0);
    m.userData.sheet = name;
    m.userData.face = true;
    return m;
  }
  const NEAR = { south: ['south-east', 'south-west'], north: ['north-east', 'north-west'], east: ['south-east', 'north-east'], west: ['south-west', 'north-west'], 'south-east': ['east', 'south'], 'south-west': ['west', 'south'], 'north-east': ['east', 'north'], 'north-west': ['west', 'north'] };
  function setFrame(m, anim, dir, t, fps) {
    const sh = SHEETS[m.userData.sheet];
    const img = G.img('../assets/' + sh.src);
    let rowInfo;
    for (const a of [anim, 'stand']) {
      const set = sh.anims[a];
      if (!set) continue;
      rowInfo = set[dir] || (NEAR[dir] || []).map((d) => set[d]).find(Boolean);
      if (rowInfo) break;
    }
    rowInfo = rowInfo || Object.values(sh.anims.stand)[0];
    const [row, n] = rowInfo;
    const f = Math.floor(t * fps) % n;
    const map = m.material.map;
    map.offset.set((f * sh.cell) / img.naturalWidth, 1 - ((row + 1) * sh.cell) / img.naturalHeight);
  }

  function syncPeople(S) {
    const st = stats();
    const alive = new Set([S.P, ...S.enemies]);
    for (const [obj, m] of meshes)
      if (!alive.has(obj)) {
        scene.remove(m);
        meshes.delete(obj);
      }
    // 주인공
    let m = meshes.get(S.P);
    if (!m) meshes.set(S.P, (m = charMesh('hero', 1))), scene.add(m);
    const P = S.P;
    const anim = P.moving && P.atkT <= 0 ? 'walk' : 'idle';
    setFrame(m, anim, P.dir, P.t, anim === 'walk' ? 11 : 5);
    m.position.set(P.x, 0, P.y);
    m.visible = !(P.invT > 0 && Math.floor(P.invT * 20) % 2 === 0 && P.flash < 0.5);
    const glow = st.aura ? 0.12 + 0.08 * Math.sin(G.time * 6) : 0;
    m.material.emissive.setRGB(P.flash + glow, P.flash + glow * 0.85, P.flash + glow * 0.4);
    // 적
    for (const e of S.enemies) {
      const isBoss = e.kind === 'boss';
      let em = meshes.get(e);
      if (!em) {
        em = charMesh('man', isBoss ? 2.1 : 0.85);
        em.material.color.set(isBoss ? 0xd07070 : 0x6a5a8e);
        meshes.set(e, em);
        scene.add(em);
      }
      setFrame(em, 'stand', e.dir, 0, 1);
      const bob = isBoss ? 0 : Math.abs(Math.sin(e.t * 9)) * 2;
      em.position.set(e.x, -(e.lift || 0) + bob, e.y);
      const warn = isBoss && telegraphing(e) ? 0.25 + 0.25 * Math.sin(G.time * 30) : 0;
      const f = Math.max(e.flash, warn);
      em.material.emissive.setRGB(f, f * (isBoss ? 0.6 : 1), f * (isBoss ? 0.6 : 1));
    }
  }

  // ── 베기 · 예고 · 탄: 매 프레임 새로 만들고 다음 프레임에 지운다
  function addFx(mesh) {
    scene.add(mesh);
    fxMeshes.push(mesh);
  }
  function clearFx() {
    for (const m of fxMeshes) {
      scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    fxMeshes.length = 0;
  }
  function flat(geo, color, opacity, y, add) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.rotation.x = Math.PI / 2; // 바닥에 눕힘: (cos a, sin a) → (X, Z)
    m.position.y = y;
    return m;
  }

  function syncFx(S) {
    clearFx();
    const P = S.P;
    for (const s of S.slashes) {
      const k = s.t / s.life;
      let m;
      if (s.arc >= Math.PI * 2) {
        const r = s.reach * (0.6 + 0.4 * k);
        m = flat(new THREE.RingGeometry(r - 4, r, 40), weaponColor(), 1 - k, 14, true);
      } else {
        const a0 = s.ang - s.arc / 2;
        const len = s.arc * Math.min(1, k * 2.2);
        m = flat(new THREE.RingGeometry(s.reach - (s.kind === 3 ? 12 : 9), s.reach, 24, 1, a0, Math.max(0.01, len)), weaponColor(), (1 - k) * 0.95, 14, true);
      }
      m.position.x = P.x;
      m.position.z = P.y;
      addFx(m);
    }
    const b = S.boss;
    if (b && !b.dead) {
      const fast = b.hp < b.maxHp / 2 ? 0.75 : 1;
      if (b.state === 'charge' && b.st <= 0.85 * fast && b.cang != null) {
        const k = b.st / (0.85 * fast);
        const geo = new THREE.PlaneGeometry(420, b.r * 2);
        geo.translate(210, 0, 0);
        const m = flat(geo, 0xff3c3c, 0.15 + 0.3 * k, 0.6);
        m.rotation.z = -b.cang; // 눕힌 판에서 z 회전 = 바닥 위 방향
        m.position.x = b.x;
        m.position.z = b.y;
        // 눕힌 뒤 돌리기: X축 눕힘과 함께 쓰려면 순서를 맞춘다
        m.rotation.set(Math.PI / 2, 0, b.cang);
        addFx(m);
      }
      if (b.state === 'slam' && b.tx != null && !b.landed) {
        const k = Math.min(1, b.st / (1.1 * fast));
        const m1 = flat(new THREE.CircleGeometry(54, 40), 0xff3c3c, 0.12 + 0.22 * k, 0.6);
        const m2 = flat(new THREE.RingGeometry(Math.max(0.1, 54 * k - 2), Math.max(0.2, 54 * k), 40), 0xff5050, 0.9, 0.7);
        const m3 = flat(new THREE.RingGeometry(52, 54, 40), 0xff5050, 0.9, 0.7);
        for (const m of [m1, m2, m3]) {
          m.position.x = b.tx;
          m.position.z = b.ty;
          addFx(m);
        }
      }
    }
    for (const s of S.shots) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s.r, 8, 6), new THREE.MeshBasicMaterial({ color: s.mine ? weaponColor() : 0xff4f6d, transparent: !!s.mine, opacity: 0.85 }));
      // 2D에서 탄은 높이를 y에서 뺀 값 → 바닥 자리로 되돌리고 높이를 준다
      const hgt = s.mine ? 14 : 18;
      m.position.set(s.x, hgt, s.y + (s.mine ? 14 : 12));
      addFx(m);
    }
  }

  // 월드(2D x, y) → 겹친 2D 화면 좌표
  const v = new THREE.Vector3();
  function toScreen(x, y) {
    v.set(x, 0, y).project(camera);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  }

  function draw(ctx) {
    if (!renderer) init();
    const S = ACT.get();
    // 3D 화면을 2D 화면과 같은 자리 · 크기로
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

    // 카메라: 주인공을 따라가며 비스듬히 내려다봄
    const P = S.P;
    const tx = G.clamp(P.x, 160, WORLD.w - 160);
    const tz = G.clamp(P.y, 90, WORLD.h - 40);
    const want = new THREE.Vector3(tx, Math.sin(PITCH) * DIST, tz + Math.cos(PITCH) * DIST);
    if (!camPos.lengthSq()) camPos.copy(want);
    camPos.lerp(want, 0.12);
    const [sx, sy] = G.fx.shakeOffset();
    camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z);
    camera.lookAt(camPos.x + sx, sy, camPos.z - Math.cos(PITCH) * DIST);
    sun.position.set(camPos.x - 220, 480, camPos.z + 60); // 앞 왼쪽 위에서 → 그림자는 뒤 오른쪽으로
    sun.target.position.set(camPos.x, 0, camPos.z - Math.cos(PITCH) * DIST);

    syncPeople(S);
    syncFx(S);
    // 판은 카메라를 바라보게(세운 채로 살짝 뒤로 눕힘)
    scene.traverse((o) => {
      if (o.userData.face) o.quaternion.copy(camera.quaternion);
    });
    renderer.render(scene, camera);

    // 겹친 2D 화면: 숫자 · 조각 · 글자 · 막대 · 손가락 버튼
    ctx.clearRect(0, 0, W, H);
    G.fx.draw(ctx, toScreen);
    ACT.drawHud(ctx);
    I.drawTouch(ctx);
  }

  G.start({ w: W, h: H, update: ACT.step, draw });
})();
