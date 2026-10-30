// 맛보기 b3 · 사람 모으고 배치하기 — 일꾼을 숲 · 돌산 · 공사장에 보낸다. 일하면서 솜씨가 늘고,
// 주인공과 같은 곳에서 일하면 배워서 두 배로 는다. 지은 집의 반듯함 = 지은 사람들 목수 솜씨. 집이 늘면 더 데려올 수 있다.
// 조작: 오른쪽에서 사람을 누르고 → 아래에서 보낼 곳을 누르기 · ?new 처음부터. 숫자는 전부 임시
(function () {
  const W = 480,
    H = 270;
  const MAP = { w: 760, h: 520 };
  const SAVE_KEY = 'proto-b3';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);
  const I = G.input;

  const CAMP = { x: 380, z: 250 };
  const SITES = {
    rest: { name: '쉬기', x: 380, z: 250 },
    wood: { name: '숲', x: 130, z: 150 },
    stone: { name: '돌산', x: 640, z: 150 },
    lot0: { name: '공사장1', x: 230, z: 390 },
    lot1: { name: '공사장2', x: 380, z: 410 },
    lot2: { name: '공사장3', x: 530, z: 390 },
  };
  const LOTS = ['lot0', 'lot1', 'lot2'];
  const COST = { hut: { wood: 6 }, house: { wood: 12, stone: 4 }, house2: { wood: 18, stone: 8 } };
  const WORK = { hut: 10, house: 22, house2: 36 }; // 지을 일의 양
  const HOMES = { hut: 2, house: 3, house2: 4 };
  const NAMES = ['영희', '철수', '민수', '지현', '바우', '순자', '덕배', '말순', '돌쇠', '연이', '갑동', '복실'];
  const JOB = { wood: '나무', stone: '돌', build: '목수' };

  const save = G.load(SAVE_KEY, null);
  const st = save || {
    store: { wood: 8, stone: 2 },
    people: [
      { name: '주인공', hero: true, skill: { wood: 2, stone: 2, build: 4 }, job: 'rest' },
      { name: '영희', look: 'girl2', tint: 0xffffff, skill: { wood: 1, stone: 1, build: 1 }, job: 'rest' },
      { name: '철수', look: 'man', tint: 0xffe8d0, skill: { wood: 1.5, stone: 1, build: 1 }, job: 'rest' },
    ],
    lots: { lot0: null, lot1: null, lot2: null },
    homes: [], // 다 지은 집 { type, q, seed, at }
    nameI: 2,
  };
  const persist = () => G.save(SAVE_KEY, { store: st.store, people: st.people.map(({ sp, x, z, tx, tz, ...p }) => p), lots: st.lots, homes: st.homes, nameI: st.nameI });

  const cap = () => 3 + st.homes.reduce((a, h) => a + HOMES[h.type], 0);
  const skillOf = (p, job) => p.skill[job];
  let sel = null;
  let wanderer = null;
  let wanderT = 15;
  let toast = [];
  const lotMesh = {};
  let pendingType = 'hut';

  function say(str, color = '#ffe9a8') {
    toast.push({ str, t: 0, color });
    if (toast.length > 4) toast.shift();
  }

  function jobKind(job) {
    return job === 'wood' ? 'wood' : job === 'stone' ? 'stone' : job.startsWith('lot') ? 'build' : null;
  }

  function spawnSprite(p) {
    p.sp = p.hero ? G.w3d.sprite('hero', 1) : G.w3d.sprite(p.look, 0.85).color(p.tint);
    const s = SITES[p.job] || SITES.rest;
    p.x = s.x + G.rand(-30, 30);
    p.z = s.z + G.rand(-20, 20);
    pickSpot(p);
  }
  function pickSpot(p) {
    const s = SITES[p.job] || SITES.rest;
    p.tx = s.x + G.rand(-36, 36);
    p.tz = s.z + G.rand(-22, 22);
  }

  // 공사장 그림
  function refreshLot(id) {
    if (lotMesh[id]) G.w3d.scene.remove(lotMesh[id]);
    lotMesh[id] = null;
    const L = st.lots[id];
    if (!L) return;
    const q = L.workDone > 0 ? Math.min(1, Math.max(0, (L.skillSum / L.workDone - 1) / 7)) : 0;
    L.q = q;
    const g = G.build.make(L.type, { q, seed: L.seed });
    g.position.set(SITES[id].x, 0, SITES[id].z - 40);
    G.build.progress(g, Math.max(0.02, L.workDone / WORK[L.type]));
    G.w3d.scene.add(g);
    lotMesh[id] = g;
  }

  const homeSpots = [];
  for (let i = 0; i < 12; i++) homeSpots.push({ x: 90 + (i % 6) * 120, z: i < 6 ? 40 : 500 });
  function addHomeMesh(h) {
    const at = homeSpots[h.at % homeSpots.length];
    const g = G.build.make(h.type, { q: h.q, seed: h.seed });
    g.position.set(at.x, 0, at.z);
    G.w3d.scene.add(g);
  }

  // ── 반복
  function update(dt) {
    G.fx.update(dt);
    for (const t of toast) t.t += dt;
    toast = toast.filter((t) => t.t < 4);
    G.w3d.follow(CAMP.x + 75, CAMP.z - 10); // 오른쪽 사람 목록만큼 비켜서

    // 누구를 어디로
    st.people.forEach((p, i) => {
      if (G.ui.hit('p' + i)) sel = sel === p ? null : p;
    });
    if (sel)
      for (const id in SITES)
        if (G.ui.hit('s:' + id)) {
          if (id.startsWith('lot') && !st.lots[id]) {
            say(`${SITES[id].name}에 지을 게 없다 — 먼저 「짓기 시작」`, '#ffb0b0');
            continue;
          }
          sel.job = id;
          pickSpot(sel);
          sel = null;
        }
    for (const t in COST) if (G.ui.hit('t:' + t)) pendingType = t;
    if (G.ui.hit('start')) {
      const id = LOTS.find((l) => !st.lots[l]);
      const c = COST[pendingType];
      if (!id) say('빈 공사장이 없다', '#ffb0b0');
      else if (!Object.entries(c).every(([k, v]) => st.store[k] >= v)) say('재료가 모자란다', '#ffb0b0');
      else {
        Object.entries(c).forEach(([k, v]) => (st.store[k] -= v));
        st.lots[id] = { type: pendingType, workDone: 0, skillSum: 0, seed: Math.floor(Math.random() * 1e6) };
        refreshLot(id);
        say(`${SITES[id].name}: ${G.build.NAME[pendingType]} 짓기 시작 — 목수를 보내자`);
      }
    }
    if (wanderer && G.ui.hit('recruit')) {
      if (st.people.length >= cap()) say('잘 곳이 없다 — 집을 더 짓자', '#ffb0b0');
      else if (st.store.wood < 5) say('데려오려면 나무 5', '#ffb0b0');
      else {
        st.store.wood -= 5;
        const p = wanderer.p;
        p.job = 'rest';
        st.people.push(p);
        wanderer.sp.remove();
        spawnSprite(p);
        say(`${p.name}이(가) 함께하게 됐다`);
        wanderer = null;
      }
    }

    // 떠돌이가 가끔 지나간다
    wanderT -= dt;
    if (!wanderer && wanderT <= 0) {
      wanderT = 30;
      const look = Math.random() < 0.5 ? 'girl2' : 'man';
      const p = { name: NAMES[++st.nameI % NAMES.length], look, tint: G.pick([0xffffff, 0xffe0d0, 0xd8e8ff, 0xe8ffd8, 0xffd8f0]), skill: { wood: G.rand(1, 2.5), stone: G.rand(1, 2.5), build: G.rand(1, 2) }, job: 'rest' };
      wanderer = { p, sp: G.w3d.sprite(look, 0.85).color(p.tint), x: -20, z: 300, t: 0 };
      say(`떠돌이 ${p.name}이(가) 지나간다`);
    }
    if (wanderer) {
      wanderer.t += dt;
      wanderer.x += 18 * dt;
      wanderer.sp.set('stand', 'east').at(wanderer.x, wanderer.z, Math.abs(Math.sin(G.time * 9)) * 1.5);
      if (wanderer.x > MAP.w + 20) {
        wanderer.sp.remove();
        wanderer = null;
      }
    }

    // 일하기 · 솜씨 늘기
    const heroJob = st.people.find((p) => p.hero).job;
    const lotWorkers = {};
    for (const p of st.people) {
      // 걷기
      const dx = p.tx - p.x,
        dz = p.tz - p.z,
        d = Math.hypot(dx, dz);
      const atSite = G.dist(p.x, p.z, SITES[p.job].x, SITES[p.job].z) < 60;
      if (d > 2) {
        p.x += (dx / d) * 40 * dt;
        p.z += (dz / d) * 40 * dt;
      } else if (Math.random() < dt * 0.3) pickSpot(p);
      const kind = jobKind(p.job);
      const working = kind && atSite && (kind !== 'build' || st.lots[p.job]);
      if (p.hero) p.sp.set(d > 2 ? 'walk' : 'idle', G.dirOf(dx, dz), G.time, d > 2 ? 10 : 5).at(p.x, p.z, working ? Math.abs(Math.sin(G.time * 12)) * -1.2 : 0);
      else p.sp.set('stand', d > 2 ? G.dirOf(dx, dz) : 'south').at(p.x, p.z, d > 2 ? Math.abs(Math.sin(G.time * 9)) * 1.5 : working ? Math.abs(Math.sin(G.time * 12)) * 1.5 : 0);
      p.sp.glow(sel === p ? 0.25 + 0.15 * Math.sin(G.time * 8) : 0);
      if (!working) continue;
      const s = skillOf(p, kind);
      if (kind === 'wood') st.store.wood += 0.22 * s * dt;
      if (kind === 'stone') st.store.stone += 0.16 * s * dt;
      if (kind === 'build') (lotWorkers[p.job] = lotWorkers[p.job] || []).push(p);
      // 솜씨가 는다(주인공과 같이 일하면 두 배, 높을수록 천천히)
      if (!p.hero) {
        const before = Math.floor(s);
        const teach = heroJob === p.job ? 2 : 1;
        p.skill[kind] = Math.min(10, s + (0.05 * teach * dt) / Math.sqrt(s));
        if (Math.floor(p.skill[kind]) > before) {
          say(`${p.name} ${JOB[kind]} 솜씨 Lv ${Math.floor(p.skill[kind])}!${teach > 1 ? ' (주인공에게 배움)' : ''}`, '#b8ffb0');
          const [sx, sy] = G.w3d.toScreen(p.x, 50, p.z);
          G.fx.num(sx, sy, '솜씨 UP', { color: '#b8ffb0', size: 10 });
        }
      }
    }
    // 공사 진행
    for (const id of LOTS) {
      const L = st.lots[id];
      const ws = lotWorkers[id];
      if (!L || !ws) continue;
      const before = Math.floor((L.workDone / WORK[L.type]) * 12);
      for (const p of ws) {
        const s = p.skill.build;
        L.workDone += s * 0.25 * dt;
        L.skillSum += s * s * 0.25 * dt; // 반듯함 = 일한 만큼 가중한 목수 솜씨 평균
      }
      if (L.workDone >= WORK[L.type]) {
        refreshLot(id);
        const h = { type: L.type, q: L.q, seed: L.seed, at: st.homes.length };
        st.homes.push(h);
        G.w3d.scene.remove(lotMesh[id]);
        lotMesh[id] = null;
        addHomeMesh(h);
        st.lots[id] = null;
        say(`${G.build.NAME[h.type]} 완성! 반듯함 ${Math.round(h.q * 100)} · 잘 곳 +${HOMES[h.type]}`);
        for (const p of ws) (p.job = 'rest'), pickSpot(p);
        persist();
      } else if (Math.floor((L.workDone / WORK[L.type]) * 12) !== before) refreshLot(id);
    }
    if (Math.floor(G.time) !== Math.floor(G.time - dt) && Math.floor(G.time) % 5 === 0) persist();
  }

  // ── 그리기
  function draw(ctx) {
    G.w3d.render(ctx);
    G.ui.begin();
    // 위: 창고 · 사람 수
    G.ui.panel(ctx, 4, 4, 196, 20);
    G.text(ctx, `창고  나무 ${Math.floor(st.store.wood)}  돌 ${Math.floor(st.store.stone)}   사람 ${st.people.length}/${cap()}`, 10, 9, { size: 9 });

    // 공사장 진행 글자
    for (const id of LOTS) {
      const L = st.lots[id];
      const [sx, sy] = G.w3d.toScreen(SITES[id].x, 0, SITES[id].z + 10);
      if (L) G.text(ctx, `${G.build.NAME[L.type]} ${Math.floor((L.workDone / WORK[L.type]) * 100)}% · 반듯함 ${Math.round((L.q || 0) * 100)}`, sx, sy, { align: 'center', size: 8 });
      else G.text(ctx, SITES[id].name + ' (비었음)', sx, sy, { align: 'center', size: 8, alpha: 0.6 });
    }
    for (const id of ['wood', 'stone']) {
      const [sx, sy] = G.w3d.toScreen(SITES[id].x, 0, SITES[id].z + 40);
      G.text(ctx, SITES[id].name, sx, sy, { align: 'center', size: 9, bold: true });
    }

    // 오른쪽: 사람들
    const px = W - 150;
    G.ui.panel(ctx, px - 4, 28, 150, Math.min(H - 70, 16 + st.people.length * 24));
    G.text(ctx, '사람 (눌러서 고르기)', px, 31, { size: 8, color: '#cfc4dc' });
    st.people.slice(0, 7).forEach((p, i) => {
      const y = 44 + i * 24;
      G.ui.button(ctx, 'p' + i, px, y, 142, 22, '', { on: sel === p, color: '#5a4a7a' });
      G.text(ctx, p.name, px + 4, y + 3, { size: 9, bold: true, color: p.hero ? '#ffd86b' : '#fff' });
      G.text(ctx, SITES[p.job].name, px + 4, y + 13, { size: 7, color: '#cfc4dc' });
      ['wood', 'stone', 'build'].forEach((k, j) => {
        const bx = px + 52 + j * 30,
          v = p.skill[k];
        G.text(ctx, JOB[k][0] + Math.floor(v), bx, y + 3, { size: 7, color: '#ddd' });
        ctx.fillStyle = '#3a3040';
        ctx.fillRect(bx, y + 14, 26, 3);
        ctx.fillStyle = k === 'build' ? '#ffd86b' : k === 'wood' ? '#8fd86b' : '#b8c0d0';
        ctx.fillRect(bx, y + 14, Math.round(26 * (v / 10)), 3);
      });
    });

    // 아래: 보낼 곳 / 짓기
    const y = H - 30;
    G.ui.panel(ctx, 4, y - 14, W - 160, 42);
    if (sel) {
      G.text(ctx, `${sel.name}을(를) 어디로?`, 10, y - 11, { size: 8, color: '#ffe9a8' });
      let x = 8;
      for (const id in SITES) {
        G.ui.button(ctx, 's:' + id, x, y, 50, 24, SITES[id].name, { on: sel.job === id, off: id.startsWith('lot') && !st.lots[id], size: 8 });
        x += 52;
      }
    } else {
      G.text(ctx, '짓기 시작 — 고른 걸 빈 공사장에', 10, y - 11, { size: 8, color: '#cfc4dc' });
      let x = 8;
      for (const t in COST) {
        const c = Object.entries(COST[t]).map(([k, v]) => (k === 'wood' ? '나' : '돌') + v).join('');
        G.ui.button(ctx, 't:' + t, x, y, 70, 24, `${G.build.NAME[t]} ${c}`, { on: pendingType === t, size: 8 });
        x += 72;
      }
      G.ui.button(ctx, 'start', x, y, 74, 24, '짓기 시작', { color: '#3a7a5a', on: true, size: 9 });
    }
    if (wanderer) {
      const [sx, sy] = G.w3d.toScreen(wanderer.x, 60, wanderer.z);
      const p = wanderer.p;
      G.ui.button(ctx, 'recruit', Math.round(sx - 50), Math.round(sy - 24), 100, 22, `${p.name} 데려오기(나무5)`, { color: '#3a7a5a', on: true, size: 8 });
      G.text(ctx, `나${Math.floor(p.skill.wood)} 돌${Math.floor(p.skill.stone)} 목${Math.floor(p.skill.build)}`, sx, sy, { align: 'center', size: 7 });
    }

    toast.forEach((t, i) => G.text(ctx, t.str, 8, 30 + i * 12, { size: 8, color: t.color, alpha: t.t > 3.4 ? (4 - t.t) / 0.6 : 1 }));
    G.fx.draw(ctx);
  }

  // ── 시작
  G.start({ w: W, h: H, update, draw });
  G.w3d.init({ pitch: 0.8, dist: 780 });
  G.w3d.ground(MAP.w, MAP.h, { seed: 41, deco: 0.005, patch: 0.04 });
  const ws = G.build.make('workshop', { q: 0.6, seed: 5 });
  ws.position.set(CAMP.x, 0, CAMP.z - 30);
  G.w3d.scene.add(ws);
  for (let i = 0; i < 16; i++) G.w3d.tree(SITES.wood.x + G.rand(-90, 90), SITES.wood.z + G.rand(-70, 30), 1.9 + Math.random() * 0.5, i % 2);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(10 + Math.random() * 8, 0), new THREE.MeshLambertMaterial({ color: 0x8d9096, flatShading: true }));
    m.position.set(SITES.stone.x + G.rand(-80, 80), 6, SITES.stone.z + G.rand(-60, 30));
    m.castShadow = m.receiveShadow = true;
    G.w3d.scene.add(m);
  }
  for (const p of st.people) spawnSprite(p);
  for (const id of LOTS) refreshLot(id);
  for (const h of st.homes) addHomeMesh(h);
  G.w3d.follow(CAMP.x + 75, CAMP.z - 10, true);
})();
