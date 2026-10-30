// 맛보기 b4 · 부탁 들어주기 — 마을 사람이 사연을 말하면, 오른쪽에서 집 모양을 골라 지어 준다.
// 맞춘 만큼 별을 받고, 솜씨가 좋으면(반듯하면) 별 하나 더. 다 지으면 그 사람이 들어와 산다. 숫자 · 대사는 전부 임시.
// 조작: 대사를 누르면 다음 · 오른쪽에서 고르고 「짓기」 · ?new 처음부터
(function () {
  const W = 480,
    H = 270;
  const SAVE_KEY = 'proto-b4';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);
  const I = G.input;
  const LOT_X = (i) => 70 + i * 110;
  const LOT_Z = 120;

  // 부탁: 대사 + 맞춰야 할 것(need). type · windows(이상/이하) · flowers · chimney · roof
  const REQS = [
    {
      name: '바우',
      look: 'man',
      tint: 0xd8c8b0,
      lines: ['나무꾼 바우요. 혼자 살 거라 작아도 됩니다.', '창은 하나면 돼요. 숲에서 하루 종일 있으니까.', '…겨울엔 좀 춥긴 하더군요.'],
      need: { type: 'hut', windowsMax: 1, chimney: true },
      say: { type: '작은 집이 딱 좋아요', windowsMax: '창 하나, 좋네요', chimney: '굴뚝까지! 겨울 걱정 없겠어요' },
    },
    {
      name: '순자 할머니',
      look: 'girl2',
      tint: 0xe8e0f0,
      lines: ['아이고, 젊은 목수 양반.', '내가 꽃을 참 좋아해요. 창가에 꽃이 있으면 좋겠어.', '무릎이 아파서 위층은 못 올라가요.'],
      need: { type: 'house', flowers: true },
      say: { type: '한 층이라 다니기 편하겠어', flowers: '창가 꽃 좀 봐, 고와라' },
    },
    {
      name: '덕배',
      look: 'man',
      tint: 0xffe0c8,
      lines: ['애가 셋이라 정신이 없어요, 하하.', '방이 많아야 해요. 위아래로 넓게요.', '애들이 어두운 걸 무서워해서 창이 많으면 좋겠어요.'],
      need: { type: 'house2', windowsMin: 4 },
      say: { type: '이층이라 애들 방이 따로 생겼어요', windowsMin: '창이 많아 환하네요' },
    },
    {
      name: '연이',
      look: 'girl2',
      tint: 0xd8f0ff,
      lines: ['그림 그리는 연이예요.', '지붕이 하늘처럼 파랬으면 해요.', '빛이 잘 들어야 그림을 그리죠. 창은 셋 이상!'],
      need: { roof: 'roofBlue', windowsMin: 3 },
      say: { roof: '파란 지붕, 그림 같아요', windowsMin: '빛이 가득해요' },
    },
    {
      name: '갑동',
      look: 'man',
      tint: 0xc8b8b8,
      lines: ['대장장이 갑동이오.', '불을 늘 쓰니 굴뚝은 꼭 있어야 하오.', '불똥이 튀니 창은 적을수록 좋소. 꽃 같은 건 다 타오.'],
      need: { type: 'house', chimney: true, windowsMax: 1, flowers: false },
      say: { type: '튼튼하구려', chimney: '굴뚝 좋소', windowsMax: '창이 적어 안심이오', flowers: '꽃이 없어 다행이오' },
    },
  ];

  const save = G.load(SAVE_KEY, { lv: 1, exp: 0, done: [] }); // done: [{ i, o, q, stars }]
  const needExp = (lv) => 5 + lv * 3;
  const skillQ = () => Math.min(1, (save.lv - 1) / 5);

  const opt = { type: 'house', windows: 2, flowers: false, chimney: false, roof: 'roof' };
  let phase = 'talk'; // talk → choose → build → react → (다음 손님)
  let line = 0;
  let cur = null; // 지금 손님 { i, sp, x, z }
  let preview = null;
  let building = null;
  let react = null;
  let banner = null;
  const residents = [];

  // 못 맞췄을 때 하는 말
  const MISS = { type: '집 크기가 생각했던 거랑 달라요', windowsMin: '좀 어둡네요… 창이 더 있었으면', windowsMax: '창이 너무 많아요', flowers: '꽃이…', chimney: '굴뚝이…', roof: '지붕 색이 생각과 달라요' };
  const MISS_F = { flowers: { true: '창가에 꽃이 없네요', false: '꽃은 없어도 되는데…' }, chimney: { true: '굴뚝이 없네요', false: '굴뚝은 필요 없는데…' } };

  function needList(r) {
    return Object.keys(r.need);
  }
  function check(r, o) {
    const n = r.need;
    const ok = {};
    if ('type' in n) ok.type = o.type === n.type;
    if ('windowsMin' in n) ok.windowsMin = o.windows >= n.windowsMin;
    if ('windowsMax' in n) ok.windowsMax = o.windows <= n.windowsMax;
    if ('flowers' in n) ok.flowers = o.flowers === n.flowers;
    if ('chimney' in n) ok.chimney = o.chimney === n.chimney;
    if ('roof' in n) ok.roof = o.roof === n.roof;
    return ok;
  }

  function houseMesh(o, q, seed) {
    return G.build.make(o.type, { q, seed, windows: o.windows, flowers: o.flowers, chimney: o.chimney, roof: o.roof === 'roofBlue' ? 'roofBlue' : o.type === 'hut' ? 'thatch' : 'roof' });
  }

  function nextGuest() {
    const i = save.done.length;
    if (i >= REQS.length) {
      phase = 'end';
      return;
    }
    const r = REQS[i];
    cur = { i, sp: G.w3d.sprite(r.look, 0.9).color(r.tint), x: LOT_X(i) + 60, z: LOT_Z + 120 };
    phase = 'talk';
    line = 0;
    Object.assign(opt, { type: 'house', windows: 2, flowers: false, chimney: false, roof: 'roof' });
  }

  function refreshPreview() {
    if (preview) G.w3d.scene.remove(preview);
    preview = null;
    if (phase !== 'choose') return;
    preview = houseMesh(opt, skillQ(), 1);
    preview.position.set(LOT_X(cur.i), 0, LOT_Z);
    preview.traverse((m) => {
      if (m.material) {
        m.material = m.material.clone();
        m.material.transparent = true;
        m.material.opacity = 0.55;
      }
    });
    G.build.progress(preview, 1);
    G.w3d.scene.add(preview);
  }

  function addDone(d) {
    const g = houseMesh(d.o, d.q, d.i + 7);
    g.position.set(LOT_X(d.i), 0, LOT_Z);
    G.w3d.scene.add(g);
    const r = REQS[d.i];
    const sp = G.w3d.sprite(r.look, 0.9).color(r.tint);
    residents.push({ sp, x: LOT_X(d.i) + G.rand(-20, 20), z: LOT_Z + 50, hx: LOT_X(d.i), t: Math.random() * 3, tx: 0, tz: 0 });
    return g;
  }

  function gainExp(n) {
    save.exp += n;
    while (save.exp >= needExp(save.lv)) {
      save.exp -= needExp(save.lv);
      save.lv++;
      banner = { a: `솜씨 Lv ${save.lv}`, b: '집이 더 반듯해진다', t: 0 };
    }
  }

  // ── 반복
  function update(dt) {
    G.fx.update(dt);
    if (banner) banner.t += dt;
    const focusX = cur ? LOT_X(cur.i) + 40 : LOT_X(Math.max(0, save.done.length - 1));
    G.w3d.follow(focusX + 40, LOT_Z + 60);

    // 손님 걷기 · 사는 사람 어슬렁
    if (cur) {
      const tx = LOT_X(cur.i) + 50,
        tz = LOT_Z + 70;
      const dx = tx - cur.x,
        dz = tz - cur.z,
        d = Math.hypot(dx, dz);
      if (d > 2) {
        cur.x += (dx / d) * 40 * dt;
        cur.z += (dz / d) * 40 * dt;
      }
      cur.sp.set('stand', d > 2 ? G.dirOf(dx, dz) : 'south').at(cur.x, cur.z, d > 2 ? Math.abs(Math.sin(G.time * 9)) * 1.5 : 0);
    }
    for (const p of residents) {
      p.t -= dt;
      if (p.t <= 0) (p.t = G.rand(2, 5)), (p.tx = p.hx + G.rand(-40, 40)), (p.tz = LOT_Z + G.rand(40, 70));
      const dx = p.tx - p.x,
        dz = p.tz - p.z,
        d = Math.hypot(dx, dz);
      if (d > 2) (p.x += (dx / d) * 18 * dt), (p.z += (dz / d) * 18 * dt);
      p.sp.set('stand', d > 2 ? G.dirOf(dx, dz) : 'south').at(p.x, p.z, d > 2 ? Math.abs(Math.sin(G.time * 9)) * 1.5 : 0);
    }

    const r = cur && REQS[cur.i];
    const tapOnTalk = I.tap && !G.ui.over(I.tap);
    if (phase === 'talk' && (tapOnTalk || G.ui.hit('talk') || I.hit('Enter') || I.hit('Space'))) {
      line++;
      if (line >= r.lines.length) {
        phase = 'choose';
        refreshPreview();
      }
    } else if (phase === 'choose') {
      let changed = true;
      if (G.ui.hit('t:hut')) opt.type = 'hut';
      else if (G.ui.hit('t:house')) opt.type = 'house';
      else if (G.ui.hit('t:house2')) opt.type = 'house2';
      else if (G.ui.hit('w-')) opt.windows = Math.max(0, opt.windows - 1);
      else if (G.ui.hit('w+')) opt.windows = Math.min(opt.type === 'hut' ? 2 : 4, opt.windows + 1);
      else if (G.ui.hit('fl')) opt.flowers = !opt.flowers;
      else if (G.ui.hit('ch')) opt.chimney = !opt.chimney;
      else if (G.ui.hit('rf')) opt.roof = opt.roof === 'roof' ? 'roofBlue' : 'roof';
      else if (G.ui.hit('again')) (phase = 'talk'), (line = 0), (changed = false), refreshPreview();
      else if (G.ui.hit('build')) {
        phase = 'build';
        refreshPreview();
        const q = skillQ();
        building = { g: houseMesh(opt, q, cur.i + 7), p: 0, q, o: Object.assign({}, opt) };
        building.g.position.set(LOT_X(cur.i), 0, LOT_Z);
        G.w3d.scene.add(building.g);
        changed = false;
      } else changed = false;
      if (opt.type === 'hut') opt.windows = Math.min(opt.windows, 2);
      if (changed) refreshPreview();
    } else if (phase === 'build') {
      building.p = Math.min(1, building.p + dt / 2.2);
      G.build.progress(building.g, building.p);
      if (building.p >= 1) {
        const ok = check(r, building.o);
        const hits = Object.values(ok).filter(Boolean).length;
        const neat = building.q >= 0.6;
        const stars = hits + (neat ? 1 : 0);
        const max = needList(r).length + 1;
        react = { ok, neat, stars, max, t: 0 };
        phase = 'react';
        gainExp(stars * 2 + 1);
        G.fx.shake(2);
      }
    } else if (phase === 'react') {
      react.t += dt;
      if (react.t > 1 && (tapOnTalk || G.ui.hit('next') || I.hit('Enter') || I.hit('Space'))) {
        save.done.push({ i: cur.i, o: building.o, q: building.q, stars: react.stars });
        G.save(SAVE_KEY, save);
        G.w3d.scene.remove(building.g);
        addDone(save.done[save.done.length - 1]);
        cur.sp.remove();
        cur = null;
        building = null;
        react = null;
        nextGuest();
      }
    }
  }

  // ── 그리기
  function draw(ctx) {
    G.w3d.render(ctx);
    G.ui.begin();
    G.ui.panel(ctx, 4, 4, 130, 32);
    G.text(ctx, `솜씨 Lv ${save.lv}`, 10, 8, { size: 10, bold: true, color: '#ffd86b' });
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(70, 12, 58, 4);
    ctx.fillStyle = '#ffd86b';
    ctx.fillRect(70, 12, Math.round((58 * save.exp) / needExp(save.lv)), 4);
    G.text(ctx, `반듯함 ${Math.round(skillQ() * 100)}  ·  사는 사람 ${save.done.length}`, 10, 22, { size: 8, color: '#cfc4dc' });

    const r = cur && REQS[cur.i];
    if (phase === 'talk' && r) {
      G.ui.button(ctx, 'talk', 10, H - 62, W - 20, 54, '', { color: '#2a2034' });
      G.text(ctx, r.name, 20, H - 56, { size: 10, bold: true, color: '#ffd86b' });
      G.text(ctx, r.lines[line], 20, H - 40, { size: 10 });
      G.text(ctx, `${line + 1}/${r.lines.length}  눌러서 다음 ▶`, W - 20, H - 20, { align: 'right', size: 8, color: '#cfc4dc' });
    }
    if (phase === 'choose') {
      const px = W - 156,
        py = 40;
      G.ui.panel(ctx, px - 6, py - 6, 156, 196, 0.88);
      G.text(ctx, `${r.name}의 집`, px, py, { size: 10, bold: true, color: '#ffd86b' });
      let y = py + 16;
      G.text(ctx, '종류', px, y + 5, { size: 8 });
      [['hut', '오두막'], ['house', '집'], ['house2', '2층집']].forEach(([t, n], k) => G.ui.button(ctx, 't:' + t, px + 30 + k * 38, y, 36, 18, n, { on: opt.type === t, size: 8 }));
      y += 24;
      G.text(ctx, `창 ${opt.windows}개`, px, y + 5, { size: 8 });
      G.ui.button(ctx, 'w-', px + 68, y, 24, 18, '−', { size: 10 });
      G.ui.button(ctx, 'w+', px + 96, y, 24, 18, '+', { size: 10 });
      y += 24;
      G.ui.button(ctx, 'fl', px, y, 70, 18, opt.flowers ? '꽃상자 있음' : '꽃상자 없음', { on: opt.flowers, size: 8 });
      G.ui.button(ctx, 'ch', px + 74, y, 70, 18, opt.chimney ? '굴뚝 있음' : '굴뚝 없음', { on: opt.chimney, size: 8 });
      y += 24;
      G.ui.button(ctx, 'rf', px, y, 144, 18, opt.roof === 'roofBlue' ? '지붕: 파랑' : '지붕: 기본', { on: opt.roof === 'roofBlue', color: '#3a5a8a', size: 8 });
      y += 26;
      G.text(ctx, '들은 말', px, y, { size: 8, color: '#cfc4dc' });
      G.ui.button(ctx, 'again', px + 80, y - 3, 64, 16, '다시 듣기', { size: 8 });
      y += 16;
      G.text(ctx, '“' + r.lines[r.lines.length - 1].slice(0, 20) + '…”', px, y, { size: 7, color: '#bbb' });
      y += 18;
      G.ui.button(ctx, 'build', px, y, 144, 26, '이대로 짓기', { on: true, color: '#3a7a5a', size: 10 });
    }
    if (phase === 'react' && react) {
      G.ui.button(ctx, 'next', 10, H - 92, W - 20, 84, '', { off: react.t <= 1 });
      G.text(ctx, `${r.name}`, 20, H - 86, { size: 10, bold: true, color: '#ffd86b' });
      G.text(ctx, '★'.repeat(react.stars) + '☆'.repeat(react.max - react.stars), W - 20, H - 87, { align: 'right', size: 12, color: '#ffd86b' });
      let y = H - 70;
      for (const k of Object.keys(react.ok)) {
        const good = react.ok[k];
        G.text(ctx, (good ? '○ ' : '× ') + (good ? r.say[k] : (MISS_F[k] ? MISS_F[k][String(r.need[k])] : MISS[k])), 20, y, { size: 9, color: good ? '#b8ffb0' : '#ffb0b0' });
        y += 12;
      }
      G.text(ctx, react.neat ? '○ 반듯하게 잘 지었네요!' : '× 조금 삐뚤빼뚤하네요 (솜씨가 늘면 반듯해진다)', 20, y, { size: 9, color: react.neat ? '#b8ffb0' : '#ffb0b0' });
      if (react.t > 1) G.text(ctx, '눌러서 다음 손님 ▶', W - 20, H - 20, { align: 'right', size: 8, color: '#cfc4dc' });
    }
    if (phase === 'end') {
      G.ui.panel(ctx, W / 2 - 140, 60, 280, 60, 0.9);
      const total = save.done.reduce((a, d) => a + d.stars, 0);
      G.text(ctx, '마을이 다 찼다!', W / 2, 70, { align: 'center', size: 14, bold: true, color: '#ffe9a8' });
      G.text(ctx, `별 ${total}개 · 솜씨 Lv ${save.lv}  —  ?new 로 다시`, W / 2, 94, { align: 'center', size: 9 });
    }
    G.fx.draw(ctx);
    if (banner && banner.t < 2.5) {
      const a = banner.t < 0.2 ? banner.t / 0.2 : banner.t > 2 ? (2.5 - banner.t) / 0.5 : 1;
      G.text(ctx, banner.a, W / 2 - 60, 50, { align: 'center', size: 16, bold: true, alpha: a, color: '#ffe9a8' });
      G.text(ctx, banner.b, W / 2 - 60, 72, { align: 'center', size: 9, alpha: a });
    }
  }

  // ── 시작
  G.start({ w: W, h: H, update, draw });
  G.w3d.init({ pitch: 0.62, dist: 460 });
  G.w3d.ground(LOT_X(REQS.length) + 80, 300, { seed: 51, deco: 0.01, patch: 0.03 });
  // 길
  const road = new THREE.Mesh(new THREE.PlaneGeometry(LOT_X(REQS.length) + 80, 34), G.tex3d.mat('dirt', { repeat: [50, 2], color: 0xe0d0b0 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set((LOT_X(REQS.length) + 80) / 2, 0.4, LOT_Z + 90);
  road.receiveShadow = true;
  G.w3d.scene.add(road);
  for (let x = 0; x < LOT_X(REQS.length) + 80; x += 40) G.w3d.tree(x + G.rand(-10, 10), 20 + G.rand(0, 20), 2 + Math.random() * 0.6, Math.random() < 0.5 ? 0 : 1);
  for (const d of save.done) addDone(d);
  nextGuest();
  G.w3d.follow((cur ? LOT_X(cur.i) : 0) + 80, LOT_Z + 60, true);
})();
