// 맛보기 b5 · 손맛 — 톱질 · 못질을 직접 한다. 한 채 = 톱질 → 못질 → 톱질 → 못질.
// 손이 정확할수록 집이 반듯해지고, 솜씨(레벨)가 오르면 톱이 덜 흔들리고 못 칠 자리가 넓어진다. 지은 집은 옆으로 줄지어 남는다.
// 조작: 톱질 = 좌우로 끌기(또는 A · D 번갈아) + 위아래로 줄 맞추기(마우스 · 손가락 높이, 또는 W · S)
//       못질 = 움직이는 표시가 가운데 올 때 누르기(Space · 클릭 · 화면 누르기) · ?new 처음부터. 숫자는 전부 임시
(function () {
  const W = 480,
    H = 270;
  const SAVE_KEY = 'proto-b5';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);
  const I = G.input;
  const LOT_X = (i) => 80 + i * 120;
  const LOT_Z = 120;
  const TYPES = ['hut', 'hut', 'house', 'house', 'house2'];

  const save = G.load(SAVE_KEY, { lv: 1, exp: 0, houses: [] }); // houses: [{ type, q }]
  const needExp = (lv) => 4 + lv * 2;
  const tol = () => 5 + save.lv * 1.3; // 톱질 허용 폭(픽셀)
  const wander = () => Math.max(0.15, 1 - (save.lv - 1) * 0.12); // 톱이 저절로 흔들리는 정도
  const zone = () => Math.min(0.32, 0.09 + (save.lv - 1) * 0.03); // 못 칠 자리 넓이(막대의 몇 분의)

  const TASKS = ['saw', 'nail', 'saw', 'nail'];
  let task = 0,
    scores = [],
    game = null,
    phase = 'play', // play → done(한 채 끝)
    house = null,
    banner = null,
    hero;

  function startTask() {
    const kind = TASKS[task];
    if (kind === 'saw') game = { kind, cut: 0, ys: [], y: 0, aim: 0, lastX: null, dirX: 0, travel: 0, keyLast: null, noise: 0 };
    else game = { kind, nail: 0, depth: 0, pos: 0, sp: 0.9 + task * 0.1, dir: 1, hits: 0, bends: 0, results: [], swing: 0, flash: null };
  }

  function newHouse() {
    const i = save.houses.length;
    const type = TYPES[Math.min(i, TYPES.length - 1)];
    house = { i, type, q: 0.5, g: null };
    remakeHouse();
    task = 0;
    scores = [];
    phase = 'play';
    startTask();
  }
  function remakeHouse() {
    if (house.g) G.w3d.scene.remove(house.g);
    house.g = G.build.make(house.type, { q: house.q, seed: house.i + 3 });
    house.g.position.set(LOT_X(house.i), 0, LOT_Z);
    G.build.progress(house.g, Math.max(0.03, task / TASKS.length));
    G.w3d.scene.add(house.g);
  }
  function addOld(h, i) {
    const g = G.build.make(h.type, { q: h.q, seed: i + 3 });
    g.position.set(LOT_X(i), 0, LOT_Z);
    G.w3d.scene.add(g);
  }

  function finishTask(score) {
    scores.push(score);
    house.q = scores.reduce((a, b) => a + b, 0) / scores.length;
    task++;
    const word = score > 0.85 ? '아주 좋아!' : score > 0.6 ? '괜찮아' : score > 0.35 ? '조금 삐뚤…' : '엉망이다…';
    G.fx.num(W / 2, 90, `${word} ${Math.round(score * 100)}`, { color: score > 0.6 ? '#b8ffb0' : '#ffb0b0', size: 14, life: 1.4 });
    remakeHouse();
    if (task >= TASKS.length) {
      phase = 'done';
      game = null;
      G.build.progress(house.g, 1);
      save.houses.push({ type: house.type, q: house.q });
      save.exp += 2 + Math.round(house.q * 4);
      let up = false;
      while (save.exp >= needExp(save.lv)) {
        save.exp -= needExp(save.lv);
        save.lv++;
        up = true;
      }
      if (up) banner = { a: `솜씨 Lv ${save.lv}`, b: '톱이 덜 흔들리고, 못 칠 자리가 넓어졌다', t: 0 };
      G.save(SAVE_KEY, save);
    } else startTask();
  }

  // ── 톱질: 좌우로 오가면 잘리고, 높이를 줄에 맞춘다
  const SAW = { x: 90, y: 150, w: 300, h: 40 }; // 판(화면 좌표)
  function updateSaw(dt) {
    const g = game;
    // 높이: 마우스 · 손가락 높이 또는 W · S
    if (I.down('KeyW') || I.down('ArrowUp')) g.aim -= 30 * dt;
    if (I.down('KeyS') || I.down('ArrowDown')) g.aim += 30 * dt;
    const p = I.pointer;
    const usingPointer = p.y > SAW.y - 40 && p.y < SAW.y + SAW.h + 40 && (I.touchUsed ? holding : true) && !I.down('KeyW') && !I.down('KeyS');
    if (usingPointer && pointerMoved) g.aim = G.clamp(p.y - (SAW.y + SAW.h / 2), -18, 18);
    // 저절로 흔들림(솜씨가 낮을수록 크게)
    g.noise += (Math.random() - 0.5) * 260 * wander() * dt;
    g.noise *= Math.pow(0.45, dt);
    g.aim = G.clamp(g.aim, -18, 18);
    g.y += (g.aim + g.noise - g.y) * Math.min(1, dt * 8);
    // 왕복 세기: 마우스 · 손가락 좌우, 또는 A · D 번갈아
    let stroke = 0;
    if (p.x !== g.lastX && g.lastX != null && (I.touchUsed ? holding : true)) {
      const dx = p.x - g.lastX;
      const d = Math.sign(dx);
      if (d && d !== g.dirX) {
        if (g.travel > 18) stroke = 1;
        g.travel = 0;
        g.dirX = d;
      }
      g.travel += Math.abs(dx);
    }
    g.lastX = p.x;
    for (const k of ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'])
      if (I.hit(k)) {
        const side = k === 'KeyA' || k === 'ArrowLeft' ? 'L' : 'R';
        if (g.keyLast !== side) stroke = 1;
        g.keyLast = side;
      }
    if (stroke) {
      const before = g.cut;
      g.cut = Math.min(1, g.cut + 0.07 + save.lv * 0.004);
      for (let c = before; c < g.cut; c += 0.01) g.ys.push(g.y);
      G.fx.burst(SAW.x + SAW.w * g.cut, SAW.y + SAW.h / 2 + g.y, '#e8c890', 3, 40);
    }
    if (g.cut >= 1) {
      const dev = g.ys.reduce((a, y) => a + Math.abs(y), 0) / Math.max(1, g.ys.length);
      finishTask(G.clamp(1 - dev / tol() + 0.15, 0, 1));
    }
  }

  // ── 못질: 움직이는 표시를 가운데에서 멈추듯 누른다. 못 3개
  const NAIL = { x: 120, y: 120, w: 240 };
  function updateNail(dt) {
    const g = game;
    g.swing = Math.max(0, g.swing - dt * 6);
    g.pos += g.dir * g.sp * dt;
    if (g.pos > 1) (g.pos = 1), (g.dir = -1);
    if (g.pos < 0) (g.pos = 0), (g.dir = 1);
    const press = I.hit('Space') || I.hit('KeyJ') || !!I.tap;
    if (!press) return;
    g.swing = 1;
    g.hits++;
    const off = Math.abs(g.pos - 0.5);
    const z = zone();
    let res;
    if (off < z * 0.3) (res = '딱!'), (g.depth += 2);
    else if (off < z) (res = '좋아'), (g.depth += 1);
    else (res = '휘었다!'), g.bends++;
    G.fx.num(NAIL.x + NAIL.w * (0.25 + g.nail * 0.25), NAIL.y + 20, res, { color: res === '휘었다!' ? '#ff8a8a' : '#fff3a0', size: 11 });
    G.fx.shake(res === '딱!' ? 3 : 1);
    if (g.depth >= 2) {
      g.results.push(Math.max(0, 1 - (g.hits - 1) * 0.22 - g.bends * 0.35));
      g.nail++;
      g.depth = 0;
      g.hits = 0;
      g.bends = 0;
      g.sp += 0.15;
      if (g.nail >= 3) finishTask(g.results.reduce((a, b) => a + b, 0) / 3);
    }
  }

  let holding = false,
    pointerMoved = false,
    lastP = { x: 0, y: 0 };
  addEventListener('pointerdown', () => (holding = true));
  addEventListener('pointerup', () => (holding = false));

  // ── 반복
  function update(dt) {
    G.fx.update(dt);
    if (banner) banner.t += dt;
    pointerMoved = I.pointer.x !== lastP.x || I.pointer.y !== lastP.y || pointerMoved;
    lastP = { x: I.pointer.x, y: I.pointer.y };
    G.w3d.follow(LOT_X(house.i) + 10, LOT_Z + 60);
    hero.set(phase === 'play' ? 'idle' : 'idle', 'north-west', G.time, 5).at(LOT_X(house.i) + 50, LOT_Z + 46, game && (game.kind === 'saw' ? Math.abs(Math.sin(G.time * 14)) * -1 : -game.swing * 3));
    if (phase === 'play' && game) {
      if (game.kind === 'saw') updateSaw(dt);
      else updateNail(dt);
    } else if (phase === 'done' && (G.ui.hit('next') || I.hit('Enter'))) newHouse();
  }

  // ── 그리기
  function draw(ctx) {
    G.w3d.render(ctx);
    G.ui.begin();
    G.ui.panel(ctx, 4, 4, 150, 32);
    G.text(ctx, `솜씨 Lv ${save.lv}`, 10, 8, { size: 10, bold: true, color: '#ffd86b' });
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(70, 12, 78, 4);
    ctx.fillStyle = '#ffd86b';
    ctx.fillRect(70, 12, Math.round((78 * save.exp) / needExp(save.lv)), 4);
    G.text(ctx, `톱 허용 ${tol().toFixed(0)} · 못 자리 ${Math.round(zone() * 200)}%`, 10, 22, { size: 8, color: '#cfc4dc' });
    G.ui.panel(ctx, W - 150, 4, 146, 20);
    G.text(ctx, `${house.i + 1}번째 집 · ${TASKS.map((t, i) => (i < task ? '■' : '□')).join('')}`, W - 77, 9, { align: 'center', size: 9 });
    // 지은 집 반듯함(옛 집 머리 위)
    save.houses.forEach((h, i) => {
      if (i === house.i) return;
      const [sx, sy] = G.w3d.toScreen(LOT_X(i), 70, LOT_Z);
      if (sx > -40 && sx < W + 40) G.text(ctx, `반듯함 ${Math.round(h.q * 100)}`, sx, sy, { align: 'center', size: 8 });
    });

    if (game && game.kind === 'saw') drawSaw(ctx);
    if (game && game.kind === 'nail') drawNail(ctx);
    if (phase === 'done') {
      G.ui.panel(ctx, W / 2 - 120, H - 76, 240, 68, 0.9);
      G.text(ctx, `${G.build.NAME[house.type]} 완성 — 반듯함 ${Math.round(house.q * 100)}`, W / 2, H - 70, { align: 'center', size: 12, bold: true, color: '#ffe9a8' });
      G.text(ctx, '손이 정확할수록, 솜씨가 오를수록 반듯해진다', W / 2, H - 52, { align: 'center', size: 8, color: '#cfc4dc' });
      G.ui.button(ctx, 'next', W / 2 - 50, H - 38, 100, 24, '다음 집 짓기', { on: true, color: '#3a7a5a', size: 10 });
    }
    G.fx.draw(ctx);
    if (banner && banner.t < 2.8) {
      const a = banner.t < 0.2 ? banner.t / 0.2 : banner.t > 2.3 ? (2.8 - banner.t) / 0.5 : 1;
      G.text(ctx, banner.a, W / 2, 50, { align: 'center', size: 18, bold: true, alpha: a, color: '#ffe9a8' });
      G.text(ctx, banner.b, W / 2, 74, { align: 'center', size: 10, alpha: a });
    }
  }

  function drawSaw(ctx) {
    const g = game,
      b = SAW;
    G.ui.panel(ctx, b.x - 14, b.y - 40, b.w + 28, b.h + 70, 0.85);
    G.text(ctx, `톱질 (${task < 2 ? '벽판' : '지붕판'}) — 좌우로 오가며, 빨간 줄에 맞춰`, b.x, b.y - 34, { size: 9, color: '#ffe9a8' });
    // 판
    ctx.fillStyle = '#c99a62';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#a87a48';
    for (let i = 0; i < 6; i++) ctx.fillRect(b.x, b.y + 4 + i * 6, b.w, 1);
    // 허용 폭 · 줄
    const cy = b.y + b.h / 2;
    ctx.fillStyle = 'rgba(120,255,120,0.18)';
    ctx.fillRect(b.x, cy - tol(), b.w, tol() * 2);
    ctx.fillStyle = '#e04040';
    ctx.fillRect(b.x, cy, b.w, 1);
    // 자른 자국
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 2;
    ctx.beginPath();
    g.ys.forEach((y, i) => {
      const x = b.x + (i / 100) * b.w;
      i ? ctx.lineTo(x, cy + y) : ctx.moveTo(x, cy + y);
    });
    ctx.stroke();
    // 톱
    const sx = b.x + b.w * g.cut,
      sy = cy + g.y;
    ctx.fillStyle = '#d8dde4';
    ctx.fillRect(sx - 2, sy - 22, 4, 22);
    ctx.fillStyle = '#7a4a24';
    ctx.fillRect(sx - 5, sy - 30, 10, 9);
    G.text(ctx, I.touchUsed ? '판 위를 좌우로 문지르기 (손가락 높이로 줄 맞추기)' : '마우스를 좌우로 흔들기 (높이로 줄 맞추기) · 또는 A D 번갈아 + W S', W / 2, b.y + b.h + 10, { align: 'center', size: 8, color: '#cfc4dc' });
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(b.x, b.y + b.h + 22, b.w, 3);
    ctx.fillStyle = '#ffd86b';
    ctx.fillRect(b.x, b.y + b.h + 22, b.w * g.cut, 3);
  }

  function drawNail(ctx) {
    const g = game,
      b = NAIL;
    G.ui.panel(ctx, b.x - 14, b.y - 44, b.w + 28, 128, 0.85);
    G.text(ctx, `못질 (${task < 2 ? '벽' : '지붕'}) — 표시가 가운데 올 때 누르기 · 못 ${g.nail + 1}/3`, b.x, b.y - 38, { size: 9, color: '#ffe9a8' });
    // 판과 못
    ctx.fillStyle = '#c99a62';
    ctx.fillRect(b.x, b.y + 30, b.w, 22);
    for (let n = 0; n < 3; n++) {
      const nx = b.x + b.w * (0.25 + n * 0.25);
      const done = n < g.nail;
      const depth = done ? 2 : n === g.nail ? g.depth : 0;
      const hgt = 16 - depth * 7;
      const bent = n === g.nail && g.bends > 0;
      ctx.fillStyle = '#9aa0a8';
      if (bent) {
        ctx.fillRect(nx - 1, b.y + 30 - hgt / 2, 2, hgt / 2);
        ctx.fillRect(nx, b.y + 30 - hgt, 5, 2);
      } else ctx.fillRect(nx - 1, b.y + 30 - hgt, 2, hgt);
      ctx.fillStyle = '#c8ccd2';
      ctx.fillRect(nx - 3, b.y + 30 - hgt - 2, 6, 2);
      if (n === g.nail) {
        // 망치
        const up = g.swing * 14;
        ctx.fillStyle = '#7a4a24';
        ctx.fillRect(nx + 8, b.y + 4 - up, 3, 22);
        ctx.fillStyle = '#5a5e66';
        ctx.fillRect(nx + 2, b.y + 2 - up, 14, 7);
      }
    }
    // 박자 막대
    const by = b.y + 64;
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(b.x, by, b.w, 8);
    const z = zone();
    ctx.fillStyle = 'rgba(120,255,120,0.45)';
    ctx.fillRect(b.x + b.w * (0.5 - z), by, b.w * z * 2, 8);
    ctx.fillStyle = 'rgba(255,240,120,0.9)';
    ctx.fillRect(b.x + b.w * (0.5 - z * 0.3), by, b.w * z * 0.6, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x + b.w * g.pos - 1, by - 3, 3, 14);
    G.text(ctx, '노랑 = 한 번에 쏙 · 초록 = 반쯤 · 밖 = 못이 휜다', W / 2, by + 14, { align: 'center', size: 8, color: '#cfc4dc' });
  }

  // ── 시작
  G.start({ w: W, h: H, update, draw });
  G.w3d.init({ pitch: 0.55, dist: 360 });
  G.w3d.ground(LOT_X(12), 280, { seed: 61, deco: 0.01, patch: 0.03 });
  for (let x = 0; x < LOT_X(12); x += 40) G.w3d.tree(x + G.rand(-10, 10), 30 + G.rand(0, 20), 2 + Math.random() * 0.6, Math.random() < 0.5 ? 0 : 1);
  const bench = G.build.make('workshop', { q: 0.6, seed: 2 });
  bench.position.set(0, 0, LOT_Z + 10);
  G.w3d.scene.add(bench);
  save.houses.forEach(addOld);
  hero = G.w3d.sprite('hero', 1);
  newHouse();
  G.w3d.follow(LOT_X(house.i) + 10, LOT_Z + 60, true);
})();
