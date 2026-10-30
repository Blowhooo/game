// 맛보기 b2 · 재료 구하러 다니기 — 숲 · 돌밭을 돌아다니며 나무 · 돌을 모아 야영지로 가져와 짓는다.
// 멀리 갈수록 「좋은 나무」(지으면 더 반듯)가 있지만 들개가 있다. 솜씨가 오르면 빨리 · 많이 캐고 가방이 커진다.
// 조작: 이동 WASD · 캐기 J(누르고 있기) / 휴대폰: 왼쪽 끌기 + 「캐기」 버튼 · ?new 처음부터. 숫자는 전부 임시
(function () {
  const W = 480,
    H = 270;
  const MAP = { w: 1280, h: 960 };
  const CAMP = { x: 640, z: 500, r: 100 };
  const SAVE_KEY = 'proto-b2';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);
  const I = G.input;

  const COST = { hut: { wood: 5 }, well: { stone: 4 }, house: { wood: 10, stone: 3 }, shed: { wood: 8 }, tower: { wood: 7 }, house2: { wood: 14, stone: 6 } };
  const UNLOCK = { hut: 1, well: 1, house: 2, shed: 3, tower: 3, house2: 5 };
  const ORDER = ['hut', 'well', 'house', 'shed', 'tower', 'house2'];
  const LOTS = [
    [-150, -40, 0], [150, -40, 0], [-150, 90, 0], [150, 90, 0], [0, -120, 0], [-260, 20, 1], [260, 20, 1], [0, 170, 0],
  ].map(([dx, dz, r]) => ({ x: CAMP.x + dx, z: CAMP.z + dz, rot: r }));

  const save = G.load(SAVE_KEY, { lv: 1, exp: 0, store: { wood: 0, stone: 0, good: 0 }, built: [] });
  const needExp = (lv) => 8 + lv * 6;
  const skillQ = () => Math.min(1, (save.lv - 1) / 7);
  const bagCap = () => 8 + (save.lv - 1) * 2;
  const workTime = () => 1.3 / (1 + 0.15 * (save.lv - 1));

  const P = { x: CAMP.x, z: CAMP.z + 40, dir: 'south', t: 0, moving: false, bag: { wood: 0, stone: 0, good: 0 }, work: 0, inv: 0, vx: 0, vz: 0 };
  const bagCount = () => P.bag.wood + P.bag.stone + P.bag.good;
  let useGood = true;
  let banner = null;
  let hero;
  const nodes = [];
  const dogs = [];
  const builds = [];

  function gainExp(n) {
    save.exp += n;
    while (save.exp >= needExp(save.lv)) {
      save.exp -= needExp(save.lv);
      save.lv++;
      banner = { a: `솜씨 Lv ${save.lv}`, b: `가방 ${bagCap()}칸 · 더 빨리 캔다 · 더 반듯하게 짓는다`, t: 0 };
    }
  }

  function addBuild(s) {
    const lot = LOTS[s.lot];
    const g = G.build.make(s.type, { q: s.q, seed: s.seed });
    g.position.set(lot.x, 0, lot.z);
    g.rotation.y = (lot.rot * Math.PI) / 2;
    G.build.progress(g, s.prog ?? 1);
    G.w3d.scene.add(g);
    builds.push(Object.assign({ g }, s));
  }

  // ── 반복
  function update(dt) {
    G.fx.update(dt);
    if (banner) banner.t += dt;
    P.t += dt;
    P.inv -= dt;
    const m = I.move();
    P.moving = !!(m.x || m.y);
    const working = (I.btn('work') || I.down('KeyJ') || I.down('Space')) && !P.moving;
    if (P.moving) P.dir = G.dirOf(m.x, m.y);
    P.vx *= Math.pow(0.002, dt);
    P.vz *= Math.pow(0.002, dt);
    P.x = G.clamp(P.x + m.x * 90 * dt + P.vx * dt, 20, MAP.w - 20);
    P.z = G.clamp(P.z + m.y * 90 * dt + P.vz * dt, 20, MAP.h - 20);
    G.w3d.follow(P.x, P.z);

    // 가까운 캘 것
    let near = null,
      nd = 30;
    for (const n of nodes) {
      if (n.left <= 0) continue;
      const d = G.dist(P.x, P.z, n.x, n.z);
      if (d < nd) (nd = d), (near = n);
    }
    P.near = near;
    if (near && working) {
      if (bagCount() >= bagCap()) {
        if (!P.fullT || P.fullT < G.time) {
          P.fullT = G.time + 1.2;
          const [sx, sy] = G.w3d.toScreen(P.x, 50, P.z);
          G.fx.num(sx, sy, '가방이 가득! 야영지로', { color: '#ffb0b0', size: 9 });
        }
      } else {
        P.work += dt;
        P.dir = G.dirOf(near.x - P.x, near.z - P.z);
        if (Math.random() < 0.3) G.fx.burst(...G.w3d.toScreen(near.x, 14, near.z), near.kind === 'stone' ? '#c8c8d0' : '#c8a070', 1, 40);
        if (P.work >= workTime()) {
          P.work = 0;
          const n = Math.min(bagCap() - bagCount(), near.kind === 'good' ? 1 : 1 + (save.lv >= 3 ? 1 : 0) + (save.lv >= 6 ? 1 : 0));
          P.bag[near.kind] += n;
          near.left--;
          gainExp(near.kind === 'good' ? 3 : 1);
          const [sx, sy] = G.w3d.toScreen(near.x, 40, near.z);
          G.fx.num(sx, sy, `+${n} ${near.kind === 'wood' ? '나무' : near.kind === 'stone' ? '돌' : '좋은 나무!'}`, { color: near.kind === 'good' ? '#ffe070' : '#fff', size: 10 });
          G.fx.shake(1);
          if (near.left <= 0) {
            near.mesh.visible = false;
            near.regrow = 45;
          }
        }
      }
    } else P.work = 0;
    for (const n of nodes)
      if (n.left <= 0 && (n.regrow -= dt) <= 0) {
        n.left = n.max;
        n.mesh.visible = true;
      }

    // 야영지: 가방 비우기
    const inCamp = G.dist(P.x, P.z, CAMP.x, CAMP.z) < CAMP.r;
    if (inCamp && bagCount() > 0) {
      for (const k in P.bag) save.store[k] += P.bag[k];
      const [sx, sy] = G.w3d.toScreen(P.x, 50, P.z);
      G.fx.num(sx, sy, '창고에 넣었다', { color: '#b8ffb0', size: 9 });
      P.bag = { wood: 0, stone: 0, good: 0 };
      G.save(SAVE_KEY, save);
    }
    P.inCamp = inCamp;

    // 들개(멀리 있는 숲에서 어슬렁, 가까이 가면 쫓아옴. 야영지엔 안 들어옴)
    for (const d of dogs) {
      d.t += dt;
      const dp = G.dist(d.x, d.z, P.x, P.z);
      let tx = d.hx + Math.cos(d.t * 0.4 + d.ph) * 60,
        tz = d.hz + Math.sin(d.t * 0.5 + d.ph) * 50,
        sp = 30;
      if (dp < 110 && !inCamp && G.dist(d.x, d.z, d.hx, d.hz) < 260) (tx = P.x), (tz = P.z), (sp = 70);
      const dx = tx - d.x,
        dz = tz - d.z,
        l = Math.hypot(dx, dz) || 1;
      d.x += (dx / l) * sp * dt;
      d.z += (dz / l) * sp * dt;
      d.dir = G.dirOf(dx, dz);
      d.sp.set('stand', d.dir).at(d.x, d.z, Math.abs(Math.sin(d.t * 10)) * 2);
      if (dp < 16 && P.inv <= 0) {
        P.inv = 1.5;
        P.vx = ((P.x - d.x) / (dp || 1)) * 200;
        P.vz = ((P.z - d.z) / (dp || 1)) * 200;
        let lost = 0;
        for (let i = 0; i < 3; i++) {
          const ks = Object.keys(P.bag).filter((k) => P.bag[k] > 0);
          if (!ks.length) break;
          P.bag[G.pick(ks)]--;
          lost++;
        }
        G.fx.shake(4);
        const [sx, sy] = G.w3d.toScreen(P.x, 50, P.z);
        G.fx.num(sx, sy, lost ? `물렸다! 재료 ${lost}개 떨어뜨림` : '물렸다!', { color: '#ff8a8a', size: 10 });
      }
    }

    // 짓기(야영지 안에서만)
    if (inCamp) {
      if (G.ui.hit('good')) useGood = !useGood;
      for (const t of ORDER)
        if (G.ui.hit('b:' + t)) {
          const lot = LOTS.findIndex((_, i) => !builds.some((b) => b.lot === i));
          if (lot < 0) continue;
          Object.entries(COST[t]).forEach(([k, v]) => (save.store[k] -= v));
          const goods = useGood ? Math.min(2, save.store.good) : 0;
          save.store.good -= goods;
          const q = Math.min(1, skillQ() + goods * 0.15);
          addBuild({ type: t, lot, q, seed: Math.floor(Math.random() * 1e6), prog: 0.01 });
          if (goods) banner = { a: '좋은 나무를 썼다', b: `반듯함 +${goods * 15}`, t: 0 };
        }
    }
    for (const b of builds)
      if (b.prog < 1) {
        b.prog = Math.min(1, b.prog + dt / 2.5);
        G.build.progress(b.g, b.prog);
        if (b.prog >= 1) {
          gainExp(Object.values(COST[b.type]).reduce((a, v) => a + v, 0));
          save.built = builds.map(({ type, lot, q, seed }) => ({ type, lot, q, seed }));
          G.save(SAVE_KEY, save);
        }
      }

    // 주인공 앞을 가리는 나무는 반투명
    for (const n of nodes) {
      if (n.kind === 'stone') continue;
      const hide = n.z > P.z && n.z - P.z < 90 && Math.abs(n.x - P.x) < 34;
      const mat = n.mesh.material;
      if (hide !== !!mat.transparent) {
        mat.transparent = hide;
        mat.opacity = hide ? 0.35 : 1;
        mat.depthWrite = !hide;
        mat.needsUpdate = true;
      }
    }

    // 주인공 그림
    const anim = P.moving ? 'walk' : 'idle';
    hero.set(anim, P.dir, P.t, P.moving ? 11 : 5).at(P.x, P.z, working && near ? Math.abs(Math.sin(G.time * 14)) * -1.5 : 0);
    hero.mesh.visible = !(P.inv > 0 && Math.floor(P.inv * 16) % 2 === 0);
  }

  const canBuild = (t) => Object.entries(COST[t]).every(([k, v]) => save.store[k] >= v) && LOTS.some((_, i) => !builds.some((b) => b.lot === i));

  // ── 그리기
  function draw(ctx) {
    G.w3d.render(ctx);
    G.ui.begin();
    G.ui.panel(ctx, 4, 4, 150, 56);
    G.text(ctx, `솜씨 Lv ${save.lv}`, 10, 8, { size: 10, bold: true, color: '#ffd86b' });
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(72, 12, 76, 4);
    ctx.fillStyle = '#ffd86b';
    ctx.fillRect(72, 12, Math.round((76 * save.exp) / needExp(save.lv)), 4);
    G.text(ctx, `가방 ${bagCount()}/${bagCap()}  나무 ${P.bag.wood} 돌 ${P.bag.stone} 좋은 ${P.bag.good}`, 10, 22, { size: 8 });
    G.text(ctx, `창고  나무 ${save.store.wood} 돌 ${save.store.stone} 좋은 나무 ${save.store.good}`, 10, 34, { size: 8, color: '#b8ffb0' });
    G.text(ctx, `반듯함 ${Math.round(skillQ() * 100)}`, 10, 46, { size: 8, color: '#cfc4dc' });

    // 캐는 중 막대
    if (P.near) {
      const [sx, sy] = G.w3d.toScreen(P.near.x, P.near.kind === 'stone' ? 26 : 60, P.near.z);
      if (P.work > 0) {
        ctx.fillStyle = '#1a1420';
        ctx.fillRect(sx - 16, sy - 3, 32, 5);
        ctx.fillStyle = '#ffd86b';
        ctx.fillRect(sx - 15, sy - 2, Math.round((30 * P.work) / workTime()), 3);
      } else G.text(ctx, I.touchUsed ? '캐기 버튼' : 'J 누르고 있기', sx, sy - 6, { align: 'center', size: 8, alpha: 0.85 });
    }

    if (P.inCamp) {
      const types = ORDER.filter((t) => UNLOCK[t] <= save.lv);
      const bw = 50,
        gap = 3;
      const total = types.length * (bw + gap) + 70;
      let x = Math.round((W - total) / 2);
      const y = H - 30;
      G.ui.panel(ctx, x - 4, y - 16, total + 6, 44);
      G.text(ctx, '야영지 — 무엇을 지을까', x, y - 13, { size: 8, color: '#e8dcf0' });
      for (const t of types) {
        G.ui.button(ctx, 'b:' + t, x, y, bw, 24, G.build.NAME[t], { off: !canBuild(t), size: 9 });
        x += bw + gap;
      }
      G.ui.button(ctx, 'good', x, y, 66, 24, useGood ? '좋은 나무 씀' : '좋은 나무 안 씀', { on: useGood, color: '#8a6a2a', size: 8 });
      G.text(ctx, types.map((t) => G.build.NAME[t] + ' ' + Object.entries(COST[t]).map(([k, v]) => (k === 'wood' ? '나' : '돌') + v).join('')).join(' · '), W / 2, y - 26, { align: 'center', size: 7, color: '#cfc4dc' });
    } else G.text(ctx, '숲(나무) · 돌밭(돌) · 먼 곳에 빛나는 좋은 나무 — 들개 조심', W / 2, H - 14, { align: 'center', size: 8, alpha: 0.8 });

    G.fx.draw(ctx);
    if (banner && banner.t < 2.5) {
      const a = banner.t < 0.2 ? banner.t / 0.2 : banner.t > 2 ? (2.5 - banner.t) / 0.5 : 1;
      G.text(ctx, banner.a, W / 2, 60, { align: 'center', size: 18, bold: true, alpha: a, color: '#ffe9a8' });
      G.text(ctx, banner.b, W / 2, 84, { align: 'center', size: 10, alpha: a });
    }
    I.drawTouch(ctx);
  }

  // ── 시작
  I.useStick(true);
  I.setButtons([{ id: 'work', label: '캐기', x: W - 44, y: H - 70, r: 24, keys: ['KeyJ', 'Space'] }]);
  G.start({ w: W, h: H, update, draw });
  G.w3d.init({ pitch: 0.75, dist: 520 });
  G.w3d.ground(MAP.w, MAP.h, { seed: 31, deco: 0.01, patch: 0.05 });
  // 야영지 바닥(흙 원)
  const campM = new THREE.Mesh(new THREE.CircleGeometry(CAMP.r, 32), G.tex3d.mat('dirt', { repeat: [12, 12], color: 0xd8c8a8 }));
  campM.rotation.x = -Math.PI / 2;
  campM.position.set(CAMP.x, 0.4, CAMP.z);
  campM.receiveShadow = true;
  G.w3d.scene.add(campM);
  const ws = G.build.make('workshop', { q: 0.5, seed: 3 });
  ws.position.set(CAMP.x, 0, CAMP.z - 30);
  G.w3d.scene.add(ws);

  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const far = (x, z) => G.dist(x, z, CAMP.x, CAMP.z) > CAMP.r + 120;
  // 숲: 위 · 왼쪽 / 돌밭: 오른쪽 · 아래
  for (let i = 0; i < 70; i++) {
    const x = rnd() * MAP.w,
      z = rnd() * MAP.h * 0.55;
    if (!far(x, z) || x > MAP.w * 0.75) continue;
    nodes.push({ kind: 'wood', x, z, left: 3, max: 3, mesh: G.w3d.tree(x, z, 1.8 + rnd() * 0.6, rnd() < 0.5 ? 0 : 1) });
  }
  for (let i = 0; i < 30; i++) {
    const x = MAP.w * 0.55 + rnd() * MAP.w * 0.45,
      z = MAP.h * 0.45 + rnd() * MAP.h * 0.55;
    if (!far(x, z)) continue;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(10 + rnd() * 6, 0), new THREE.MeshLambertMaterial({ color: 0x8d9096, flatShading: true }));
    m.position.set(x, 6, z);
    m.castShadow = m.receiveShadow = true;
    G.w3d.scene.add(m);
    nodes.push({ kind: 'stone', x, z, left: 4, max: 4, mesh: m });
  }
  // 좋은 나무: 먼 구석에, 빛남
  for (const [x, z] of [[80, 80], [1200, 120], [90, 880], [1180, 880], [640, 60], [60, 480]]) {
    const m = G.w3d.tree(x, z, 2.6, 1);
    m.material.emissive.setRGB(0.35, 0.28, 0.05);
    nodes.push({ kind: 'good', x, z, left: 2, max: 2, mesh: m });
  }
  // 들개(임시: 사람 그림에 회색만 입힘)
  for (const [x, z] of [[160, 160], [1100, 200], [200, 820], [1080, 800], [640, 140]]) {
    const sp = G.w3d.sprite('man', 0.75).color(0x8a8a8a);
    dogs.push({ x, z, hx: x, hz: z, t: rnd() * 10, ph: rnd() * 6, sp });
  }
  hero = G.w3d.sprite('hero', 1);
  for (const s of save.built) addBuild(s);
  G.w3d.follow(P.x, P.z, true);
})();
