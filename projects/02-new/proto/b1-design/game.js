// 맛보기 b1 · 설계하기 — 빈터에 무엇을 어디에 지을지 놓는다. 지을수록 솜씨가 오르고(새 건물 · 반듯한 모양),
// 예전 집을 「다시 짓기」하면 지금 솜씨로 반듯해진다. 집을 지으면 사람이 와서 산다. 숫자는 전부 임시.
// 조작: 아래에서 고르고 바닥을 누르기 · R 돌리기 · 화살표로 둘러보기 · ?new 처음부터
(function () {
  const W = 480,
    H = 270;
  const T = G.build.TILE;
  const COLS = 16,
    ROWS = 11;
  const SAVE_KEY = 'proto-b1';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);
  const I = G.input;

  const COST = { hut: { wood: 4 }, fence: { wood: 1 }, well: { stone: 3 }, house: { wood: 8, stone: 2 }, shed: { wood: 6 }, workshop: { wood: 6, stone: 1 }, tower: { wood: 5 }, house2: { wood: 12, stone: 4 } };
  const UNLOCK = { hut: 1, fence: 1, well: 1, house: 2, shed: 3, workshop: 3, tower: 4, house2: 5 };
  const HOMES = { hut: 1, house: 2, house2: 3 }; // 사는 사람 수
  const ORDER = ['hut', 'fence', 'well', 'house', 'shed', 'workshop', 'tower', 'house2'];

  const save = G.load(SAVE_KEY, { lv: 1, exp: 0, wood: 20, stone: 6, list: [] });
  const needExp = (lv) => 6 + lv * 4;
  const skillQ = () => Math.min(1, (save.lv - 1) / 7);

  let mode = 'hut'; // 고른 건물 이름 · 'rebuild' · 'remove'
  let rot = 0;
  let hover = null;
  let banner = null;
  let regen = { wood: 0, stone: 0 };
  const cam = { x: (COLS * T) / 2, z: (ROWS * T) / 2 + 20 };
  const blds = [];
  const people = [];
  let ghost = null;

  const size = (type, r) => {
    const [w, d] = G.build.SIZE[type];
    return r % 2 ? [d, w] : [w, d];
  };
  const occupied = (c, r, w, d, except) => {
    if (c < 0 || r < 0 || c + w > COLS || r + d > ROWS) return true;
    return blds.some((b) => b !== except && c < b.c + b.w && b.c < c + w && r < b.r + b.d && b.r < r + d);
  };
  const canPay = (type) => Object.entries(COST[type]).every(([k, v]) => save[k] >= v);
  const pay = (type, k = 1) => Object.entries(COST[type]).forEach(([n, v]) => (save[n] -= Math.ceil(v * k)));

  function makeMesh(b) {
    if (b.group) G.w3d.scene.remove(b.group);
    b.group = G.build.make(b.type, { q: b.q, seed: b.seed });
    b.group.position.set((b.c + b.w / 2) * T, 0, (b.r + b.d / 2) * T);
    b.group.rotation.y = (b.rot * Math.PI) / 2;
    G.build.progress(b.group, b.prog);
    G.w3d.scene.add(b.group);
  }

  function place(type, c, r, rr, o = {}) {
    const [w, d] = size(type, rr);
    const b = { type, c, r, w, d, rot: rr, q: o.q ?? skillQ(), seed: o.seed ?? Math.floor(Math.random() * 1e6), prog: o.prog ?? 0 };
    blds.push(b);
    makeMesh(b);
    if (b.prog >= 1) moveIn(b);
    return b;
  }

  function moveIn(b) {
    for (let i = 0; i < (HOMES[b.type] || 0); i++) {
      const name = Math.random() < 0.5 ? 'girl2' : 'man';
      const sp = G.w3d.sprite(name, 0.8).color(G.pick([0xffffff, 0xffe0d0, 0xd8e8ff, 0xe8ffd8]));
      const home = { x: (b.c + b.w / 2) * T, z: (b.r + b.d) * T + 10 };
      people.push({ sp, b, x: home.x + G.rand(-20, 20), z: home.z + G.rand(0, 10), tx: home.x, tz: home.z, t: Math.random() * 3, home });
    }
  }
  function moveOut(b) {
    for (const p of people.filter((p) => p.b === b)) p.sp.remove();
    for (let i = people.length - 1; i >= 0; i--) if (people[i].b === b) people.splice(i, 1);
  }

  function persist() {
    save.list = blds.map((b) => ({ type: b.type, c: b.c, r: b.r, rot: b.rot, q: b.q, seed: b.seed, prog: b.prog >= 1 ? 1 : b.prog }));
    G.save(SAVE_KEY, save);
  }

  function gainExp(n) {
    save.exp += n;
    while (save.exp >= needExp(save.lv)) {
      save.exp -= needExp(save.lv);
      save.lv++;
      const opened = ORDER.filter((t) => UNLOCK[t] === save.lv).map((t) => G.build.NAME[t]);
      banner = { a: `솜씨 Lv ${save.lv}`, b: opened.length ? '새로 지을 수 있음: ' + opened.join(' · ') : '이제 더 반듯하게 지을 수 있다', t: 0 };
    }
  }

  function tileAt(p) {
    if (!p) return null;
    const g = G.w3d.pick(p.x, p.y);
    if (!g) return null;
    return { c: Math.floor(g.x / T), r: Math.floor(g.z / T) };
  }

  // ── 반복
  function update(dt) {
    if (banner) banner.t += dt;
    // 재료가 조금씩 들어온다(임시: 설계에 집중하려고)
    regen.wood += dt;
    regen.stone += dt;
    if (regen.wood > 1.5) (regen.wood = 0), (save.wood = Math.min(60, save.wood + 1));
    if (regen.stone > 4) (regen.stone = 0), (save.stone = Math.min(30, save.stone + 1));

    const m = I.move();
    cam.x = G.clamp(cam.x + m.x * 220 * dt, 60, COLS * T - 60);
    cam.z = G.clamp(cam.z + m.y * 220 * dt, 40, ROWS * T + 40);
    G.w3d.follow(cam.x, cam.z);
    if (I.hit('KeyR')) rot = (rot + 1) % 4;

    // 짓는 중
    for (const b of blds)
      if (b.prog < 1) {
        b.prog = Math.min(1, b.prog + dt / (0.8 + b.w * b.d * 0.35));
        G.build.progress(b.group, b.prog);
        if (b.prog >= 1) {
          gainExp(Object.values(COST[b.type]).reduce((a, v) => a + v, 0));
          moveIn(b);
          const [sx, sy] = G.w3d.toScreen(b.group.position.x, 40, b.group.position.z);
          G.fx.num(sx, sy, '완성!', { color: '#ffe9a8', size: 11 });
          persist();
        }
      }

    // 사람들: 집 앞을 어슬렁
    for (const p of people) {
      p.t -= dt;
      if (p.t <= 0) {
        p.t = G.rand(1.5, 4);
        p.tx = p.home.x + G.rand(-40, 40);
        p.tz = p.home.z + G.rand(-4, 30);
      }
      const dx = p.tx - p.x,
        dz = p.tz - p.z,
        d = Math.hypot(dx, dz);
      const walking = d > 2;
      if (walking) {
        p.x += (dx / d) * 22 * dt;
        p.z += (dz / d) * 22 * dt;
      }
      p.sp.set('stand', G.dirOf(dx, dz)).at(p.x, p.z, walking ? Math.abs(Math.sin(G.time * 10)) * 1.5 : 0);
    }

    // 버튼
    for (const t of ORDER) if (G.ui.hit('b:' + t)) (mode = t), (rot = 0);
    if (G.ui.hit('rebuild')) mode = 'rebuild';
    if (G.ui.hit('remove')) mode = 'remove';
    if (G.ui.hit('rot')) rot = (rot + 1) % 4;

    // 가리키는 칸
    const p = I.tap || (!I.touchUsed ? I.pointer : null);
    hover = p && !G.ui.over(p) ? tileAt(p) : null;
    if (I.tap && hover) click(hover);
    G.fx.update(dt);
  }

  function click({ c, r }) {
    if (mode === 'rebuild' || mode === 'remove') {
      const b = blds.find((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.d);
      if (!b || b.prog < 1) return;
      const [sx, sy] = G.w3d.toScreen(b.group.position.x, 40, b.group.position.z);
      if (mode === 'remove') {
        G.w3d.scene.remove(b.group);
        moveOut(b);
        blds.splice(blds.indexOf(b), 1);
        Object.entries(COST[b.type]).forEach(([n, v]) => (save[n] += Math.floor(v / 2)));
        G.fx.num(sx, sy, '헐었다(재료 반 돌려받음)', { color: '#ddd', size: 9 });
      } else {
        if (b.q >= skillQ() - 0.001) return G.fx.num(sx, sy, '지금 솜씨로는 이게 최선', { color: '#ddd', size: 9 });
        if (!Object.entries(COST[b.type]).every(([n, v]) => save[n] >= Math.ceil(v / 2))) return G.fx.num(sx, sy, '재료가 모자람', { color: '#ff9a9a', size: 9 });
        pay(b.type, 0.5);
        b.q = skillQ();
        b.seed++;
        b.prog = 0.01;
        makeMesh(b);
      }
      persist();
      return;
    }
    const [w, d] = size(mode, rot);
    const c0 = c - Math.floor((w - 1) / 2),
      r0 = r - Math.floor((d - 1) / 2);
    if (occupied(c0, r0, w, d)) return;
    if (!canPay(mode)) {
      const [sx, sy] = G.w3d.toScreen((c + 0.5) * T, 20, (r + 0.5) * T);
      return G.fx.num(sx, sy, '재료가 모자람', { color: '#ff9a9a', size: 9 });
    }
    pay(mode);
    place(mode, c0, r0, rot, { prog: 0.01 });
    persist();
  }

  // ── 그리기
  function draw(ctx) {
    // 놓을 자리 미리 보기
    if (ghost) G.w3d.scene.remove(ghost);
    ghost = null;
    if (hover && ORDER.includes(mode)) {
      const [w, d] = size(mode, rot);
      const c0 = hover.c - Math.floor((w - 1) / 2),
        r0 = hover.r - Math.floor((d - 1) / 2);
      const bad = occupied(c0, r0, w, d) || !canPay(mode);
      ghost = G.build.footprint(mode, bad ? 0xff5050 : 0x66ccff);
      ghost.rotation.z = (rot * Math.PI) / 2;
      ghost.position.x = (c0 + w / 2) * T;
      ghost.position.z = (r0 + d / 2) * T;
      G.w3d.scene.add(ghost);
    } else if (hover) {
      const b = blds.find((b) => hover.c >= b.c && hover.c < b.c + b.w && hover.r >= b.r && hover.r < b.r + b.d);
      if (b) {
        ghost = G.build.footprint(b.type, mode === 'remove' ? 0xff5050 : 0xffe070);
        ghost.rotation.z = (b.rot * Math.PI) / 2;
        ghost.position.x = (b.c + b.w / 2) * T;
        ghost.position.z = (b.r + b.d / 2) * T;
        G.w3d.scene.add(ghost);
      }
    }
    G.w3d.render(ctx);
    G.ui.begin();

    // 왼쪽 위: 솜씨 · 재료
    G.ui.panel(ctx, 4, 4, 128, 44);
    G.text(ctx, `솜씨 Lv ${save.lv}`, 10, 8, { size: 10, bold: true, color: '#ffd86b' });
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(70, 12, 56, 4);
    ctx.fillStyle = '#ffd86b';
    ctx.fillRect(70, 12, Math.round((56 * save.exp) / needExp(save.lv)), 4);
    G.text(ctx, `나무 ${save.wood}   돌 ${save.stone}`, 10, 22, { size: 9 });
    G.text(ctx, `반듯함 ${Math.round(skillQ() * 100)}`, 10, 34, { size: 8, color: '#cfc4dc' });
    const pop = people.length;
    G.ui.panel(ctx, W - 84, 4, 80, 20);
    G.text(ctx, `사는 사람 ${pop}`, W - 44, 9, { align: 'center', size: 9 });

    // 아래: 고르기
    const bw = 46,
      gap = 3;
    const types = ORDER.filter((t) => UNLOCK[t] <= save.lv);
    const total = types.length * (bw + gap) + 3 * (bw + gap);
    let x = Math.round((W - total) / 2);
    const y = H - 30;
    G.ui.panel(ctx, x - 4, y - 16, total + 6, 44);
    for (const t of types) {
      G.ui.button(ctx, 'b:' + t, x, y, bw, 24, G.build.NAME[t], { on: mode === t, off: !canPay(t) && mode !== t, size: 9 });
      x += bw + gap;
    }
    G.ui.button(ctx, 'rot', x, y, bw, 24, '돌리기(R)', { size: 8 });
    x += bw + gap;
    G.ui.button(ctx, 'rebuild', x, y, bw, 24, '다시 짓기', { on: mode === 'rebuild', color: '#3a7a5a', size: 8 });
    x += bw + gap;
    G.ui.button(ctx, 'remove', x, y, bw, 24, '헐기', { on: mode === 'remove', color: '#8a3a3a', size: 8 });
    const tip =
      mode === 'rebuild'
        ? '예전에 지은 걸 누르면 지금 솜씨로 다시 지음(재료 반)'
        : mode === 'remove'
          ? '누르면 헐고 재료 반을 돌려받음'
          : `${G.build.NAME[mode]} — ` + Object.entries(COST[mode]).map(([k, v]) => (k === 'wood' ? '나무 ' : '돌 ') + v).join(' · ');
    G.text(ctx, tip, W / 2, y - 13, { align: 'center', size: 8, color: '#e8dcf0' });

    G.fx.draw(ctx);
    if (banner && banner.t < 2.5) {
      const a = banner.t < 0.2 ? banner.t / 0.2 : banner.t > 2 ? (2.5 - banner.t) / 0.5 : 1;
      G.text(ctx, banner.a, W / 2, 60, { align: 'center', size: 18, bold: true, alpha: a, color: '#ffe9a8' });
      G.text(ctx, banner.b, W / 2, 84, { align: 'center', size: 10, alpha: a });
    }
    I.drawTouch(ctx);
  }

  G.start({ w: W, h: H, update, draw });
  G.w3d.init({ pitch: 0.72, dist: 600 });
  G.w3d.ground(COLS * T, ROWS * T, { seed: 21, deco: 0, patch: 0.04 });
  // 칸 줄
  const pts = [];
  for (let c = 0; c <= COLS; c++) pts.push(c * T, 0.3, 0, c * T, 0.3, ROWS * T);
  for (let r = 0; r <= ROWS; r++) pts.push(0, 0.3, r * T, COLS * T, 0.3, r * T);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  G.w3d.scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })));
  // 둘레 숲
  for (let x = -40; x < COLS * T + 60; x += 36) G.w3d.tree(x + G.rand(-8, 8), -30 - G.rand(0, 40), 2 + Math.random() * 0.6, Math.random() < 0.5 ? 0 : 1);
  for (let z = 10; z < ROWS * T; z += 44) {
    G.w3d.tree(-34 - G.rand(0, 30), z, 2.2, 0);
    G.w3d.tree(COLS * T + 34 + G.rand(0, 30), z, 2.2, 1);
  }
  for (const s of save.list) place(s.type, s.c, s.r, s.rot, s);
  G.w3d.follow(cam.x, cam.z, true);
})();
