// 맛보기 ② 턴제 — 칸 위에서 수를 짠다. 보스는 「모으기 → 내려찍기」를 예고하니 빨간 칸에서 비키면 된다.
// 레벨은 회차를 넘어 이어진다. 숫자는 전부 임시. 주소 뒤 ?new 처음부터.
// 조작: 내 편을 누름 → 파란 칸에 이동 → 빨간 적을 누르면 공격 / 다시 자기를 누르면 대기
(function () {
  const W = 480,
    H = 270;
  const COLS = 12,
    ROWS = 7,
    T = 32;
  const OX = 8,
    OY = 40; // 판 위치
  const SAVE_KEY = 'proto-tactics';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);

  const I = G.input;
  const ground = G.ground.make(COLS * T, ROWS * T, { seed: 11, deco: 0, patch: 0.03 });
  const rockImg = G.img('../assets/rock_1.png');
  const treeImg = G.img('../assets/tree_0.png');

  // ── 성장(회차를 넘어 남는 것)
  const grow = G.load(SAVE_KEY, { round: 1, hero: { lv: 1, exp: 0 }, ally: { lv: 1, exp: 0 } });
  const BASE = {
    hero: { name: '주인공', sprite: 'hero', hp: 12, atk: 4, move: 4, range: 1, perLv: { hp: 2, atk: 1 } },
    ally: { name: '동료', sprite: 'girl2', hp: 9, atk: 3, move: 4, range: 2, perLv: { hp: 1, atk: 1 } },
  };
  const statsOf = (id) => {
    const b = BASE[id],
      lv = grow[id].lv;
    return { maxHp: b.hp + b.perLv.hp * (lv - 1), atk: b.atk + b.perLv.atk * (lv - 1), move: b.move + (lv >= 4 ? 1 : 0), range: b.range };
  };

  // 장애물(바위 · 나무)
  const BLOCKS = [
    [4, 1, 'tree'],
    [4, 2, 'rock'],
    [7, 4, 'rock'],
    [7, 5, 'tree'],
    [9, 1, 'rock'],
    [2, 5, 'rock'],
  ];
  const blocked = (c, r) => BLOCKS.some(([bc, br]) => bc === c && br === r);

  let units, turn, phase, sel, moveTiles, atkTiles, busy, marks, msg, endT, lastMoved;

  function makeUnit(o) {
    return Object.assign({ px: OX + o.c * T + T / 2, py: OY + o.r * T + T - 4, dir: o.side === 'me' ? 'east' : 'west', t: Math.random(), flash: 0, acted: false, moved: false, lunge: 0 }, o);
  }

  function reset() {
    units = [];
    for (const id of ['hero', 'ally']) {
      const s = statsOf(id);
      units.push(makeUnit({ id, side: 'me', name: BASE[id].name, sprite: BASE[id].sprite, c: id === 'hero' ? 1 : 0, r: id === 'hero' ? 3 : 2, hp: s.maxHp, maxHp: s.maxHp, atk: s.atk, move: s.move, range: s.range }));
    }
    const foes = [
      [8, 2],
      [8, 4],
      [10, 3],
      [6, 0],
    ];
    foes.forEach(([c, r], i) => units.push(makeUnit({ id: 'foe' + i, side: 'foe', name: '그림자', sprite: 'man', tint: 'rgba(45,25,70,0.6)', scale: 0.85, c, r, hp: 7, maxHp: 7, atk: 3, move: 3, range: 1 })));
    units.push(makeUnit({ id: 'boss', side: 'foe', boss: true, name: '큰 녀석', sprite: 'man', tint: 'rgba(150,20,30,0.45)', scale: 1.5, c: 11, r: 3, hp: 34, maxHp: 34, atk: 5, move: 2, range: 1, step: 0 }));
    turn = 1;
    phase = 'me';
    sel = null;
    moveTiles = atkTiles = null;
    busy = false;
    marks = [];
    msg = { a: `${grow.round}회차`, b: '내 편을 눌러 움직이세요', t: 0 };
    G.fx.clear();
  }

  const at = (c, r) => units.find((u) => u.hp > 0 && u.c === c && u.r === r);
  const alive = (side) => units.filter((u) => u.hp > 0 && u.side === side);
  const inside = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
  const manhattan = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);

  // 갈 수 있는 칸(BFS). 지나가는 길도 같이 기억
  function reach(u) {
    const key = (c, r) => c + ',' + r;
    const seen = new Map([[key(u.c, u.r), { c: u.c, r: u.r, d: 0, prev: null }]]);
    const q = [seen.get(key(u.c, u.r))];
    while (q.length) {
      const n = q.shift();
      if (n.d >= u.move) continue;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = n.c + dc,
          r = n.r + dr;
        if (!inside(c, r) || blocked(c, r) || seen.has(key(c, r))) continue;
        const o = at(c, r);
        if (o && o.side !== u.side) continue; // 적은 못 지나감(내 편은 지나감)
        const m = { c, r, d: n.d + 1, prev: n };
        seen.set(key(c, r), m);
        q.push(m);
      }
    }
    // 내 편이 서 있는 칸에는 멈출 수 없다
    return [...seen.values()].filter((n) => !(at(n.c, n.r) && at(n.c, n.r) !== u));
  }
  function pathTo(node) {
    const p = [];
    for (let n = node; n; n = n.prev) p.unshift({ c: n.c, r: n.r });
    return p;
  }
  function targetsFrom(u, c, r) {
    return alive(u.side === 'me' ? 'foe' : 'me').filter((e) => Math.abs(e.c - c) + Math.abs(e.r - r) <= u.range);
  }

  // ── 움직임(기다리는 일): 반복에서 풀어 준다
  let waits = [];
  const wait = (sec) => new Promise((res) => waits.push({ t: sec, res }));
  function walk(u, path) {
    return new Promise((res) => {
      u.path = path.slice(1);
      u.onArrive = res;
      if (!u.path.length) res();
    });
  }

  async function attack(a, d) {
    a.dir = G.dirOf(d.px - a.px, d.py - a.py);
    a.lunge = 1;
    await wait(0.12);
    const dmg = a.atk;
    d.hp -= dmg;
    d.flash = 1;
    G.fx.num(d.px, d.py - (d.boss ? 70 : 44), String(dmg), { color: a.side === 'me' ? '#fff3a0' : '#ff6b6b', size: 12 });
    G.fx.burst(d.px, d.py - 18, a.side === 'me' ? '#fff3a0' : '#ff6b6b', 8);
    G.fx.shake(d.boss || a.boss ? 4 : 2);
    if (a.side === 'me') gainExp(a, d.hp <= 0 ? 30 : 10);
    if (d.hp <= 0) {
      G.fx.burst(d.px, d.py - 18, '#b69cff', d.boss ? 40 : 14, 120);
      if (d.boss) marks = [];
    }
    await wait(0.35);
    checkEnd();
  }

  function gainExp(u, n) {
    const g = grow[u.id];
    g.exp += n;
    while (g.exp >= 100) {
      g.exp -= 100;
      const before = statsOf(u.id);
      g.lv++;
      const s = statsOf(u.id);
      u.maxHp = s.maxHp;
      u.hp = Math.min(s.maxHp, u.hp + (s.maxHp - before.maxHp) + 3);
      u.atk = s.atk;
      u.move = s.move;
      G.fx.num(u.px, u.py - 58, '레벨 업!', { color: '#ffd86b', size: 13, life: 1.4 });
      G.fx.burst(u.px, u.py - 20, '#ffd86b', 22, 120);
      if (s.move > before.move) G.fx.num(u.px, u.py - 72, '이동 +1', { color: '#9fe8ff', size: 9, life: 1.4 });
    }
    G.save(SAVE_KEY, grow);
  }

  function checkEnd() {
    if (phase === 'win' || phase === 'lose') return;
    if (!alive('foe').length) {
      phase = 'win';
      endT = 0;
      G.save(SAVE_KEY, grow);
    } else if (!units.find((u) => u.id === 'hero' && u.hp > 0)) {
      phase = 'lose';
      endT = 0;
      G.save(SAVE_KEY, grow);
    }
  }

  // ── 내 차례: 누르기
  function clickTile(c, r) {
    if (busy || phase !== 'me') return;
    const u = at(c, r);
    if (!sel) {
      if (u && u.side === 'me' && !u.acted) select(u);
      return;
    }
    // 고른 상태
    if (!sel.moved) {
      const m = moveTiles.find((n) => n.c === c && n.r === r);
      if (u && u.side === 'me' && u !== sel && !u.acted) return select(u);
      if (u && u.side === 'foe' && atkFromHere(u)) return doAttack(u);
      if (m) return doMove(m);
      return unselect();
    }
    // 움직인 뒤: 공격하거나 대기
    if (u && u.side === 'foe' && atkTiles.some((t) => t.c === c && t.r === r)) return doAttack(u);
    if (u === sel) return finish(sel);
    // 다른 곳을 누르면 그냥 대기
    finish(sel);
  }
  function atkFromHere(e) {
    return manhattan(sel, e) <= sel.range;
  }
  function select(u) {
    sel = u;
    moveTiles = reach(u);
    atkTiles = null;
  }
  function unselect() {
    sel = null;
    moveTiles = atkTiles = null;
  }
  async function doMove(m) {
    busy = true;
    const u = sel;
    lastMoved = { u, c: u.c, r: u.r };
    moveTiles = null;
    await walk(u, pathTo(m));
    u.moved = true;
    atkTiles = targetsFrom(u, u.c, u.r).map((e) => ({ c: e.c, r: e.r }));
    busy = false;
    if (!atkTiles.length) finish(u);
  }
  async function doAttack(e) {
    busy = true;
    const u = sel;
    moveTiles = atkTiles = null;
    await attack(u, e);
    busy = false;
    finish(u);
  }
  function finish(u) {
    u.acted = true;
    unselect();
    if (alive('me').every((m) => m.acted)) endTurn();
  }

  // ── 적 차례
  async function endTurn() {
    if (phase !== 'me') return;
    unselect();
    phase = 'foe';
    busy = true;
    msg = { a: '적의 차례', b: '', t: 0 };
    await wait(0.6);
    for (const e of alive('foe')) {
      if (phase !== 'foe') break;
      if (e.boss) await bossAct(e);
      else await foeAct(e);
    }
    if (phase !== 'foe') return;
    turn++;
    phase = 'me';
    busy = false;
    for (const u of units) u.acted = u.moved = false;
    const b = units.find((u) => u.boss && u.hp > 0);
    msg = { a: `${turn}번째 차례`, b: b && marks.length ? '빨간 칸에서 비키세요!' : '', t: 0 };
  }

  async function foeAct(e) {
    const tiles = reach(e);
    const foes = alive('me');
    // 공격할 수 있는 칸 중 가장 가까운 곳, 없으면 가장 가까운 내 편 쪽으로
    let best = null;
    for (const n of tiles) {
      const ts = targetsFrom(e, n.c, n.r);
      if (ts.length) {
        const tgt = ts.sort((a, b) => a.hp - b.hp)[0];
        if (!best || !best.tgt || n.d < best.n.d) best = { n, tgt };
      }
    }
    if (!best) {
      let min = 1e9;
      for (const n of tiles)
        for (const f of foes) {
          const d = Math.abs(f.c - n.c) + Math.abs(f.r - n.r);
          if (d < min) {
            min = d;
            best = { n };
          }
        }
    }
    if (!best) return;
    await walk(e, pathTo(best.n));
    if (best.tgt && best.tgt.hp > 0) await attack(e, best.tgt);
    else await wait(0.15);
  }

  // 보스: 보통 → 모으기(다음 차례에 맞을 칸 예고) → 내려찍기 → 보통 …
  async function bossAct(b) {
    const kind = ['normal', 'mark', 'slam'][b.step % 3];
    b.step++;
    if (kind === 'normal') return foeAct(b);
    if (kind === 'mark') {
      const tgt = alive('me').sort((x, y) => manhattan(b, x) - manhattan(b, y))[0];
      marks = [];
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (inside(tgt.c + dc, tgt.r + dr)) marks.push({ c: tgt.c + dc, r: tgt.r + dr });
      b.charging = true;
      G.fx.num(b.px, b.py - 80, '힘을 모은다…', { color: '#ffb0b0', size: 10, life: 1.4 });
      await wait(0.9);
      return;
    }
    // 내려찍기
    b.charging = false;
    b.lift = 1;
    await wait(0.35);
    b.lift = 0;
    G.fx.shake(7);
    for (const m of marks) G.fx.burst(OX + m.c * T + T / 2, OY + m.r * T + T / 2, '#c9b38f', 4, 80);
    const hit = alive('me').filter((u) => marks.some((m) => m.c === u.c && m.r === u.r));
    for (const u of hit) {
      u.hp -= 8;
      u.flash = 1;
      G.fx.num(u.px, u.py - 44, '8', { color: '#ff6b6b', size: 14 });
    }
    if (!hit.length) G.fx.num(b.px, b.py - 80, '빗나감!', { color: '#b8ffb0', size: 11, life: 1.2 });
    marks = [];
    await wait(0.6);
    checkEnd();
  }

  // ── 반복
  function update(dt) {
    G.fx.update(dt);
    if (msg) msg.t += dt;
    for (const w of waits) w.t -= dt;
    const done = waits.filter((w) => w.t <= 0);
    waits = waits.filter((w) => w.t > 0);
    done.forEach((w) => w.res());

    for (const u of units) {
      u.flash = Math.max(0, u.flash - dt * 4);
      u.lunge = Math.max(0, u.lunge - dt * 5);
      if (u.path && u.path.length) {
        u.t += dt;
        const n = u.path[0];
        const tx = OX + n.c * T + T / 2,
          ty = OY + n.r * T + T - 4;
        const dx = tx - u.px,
          dy = ty - u.py;
        const d = Math.hypot(dx, dy);
        const sp = 120 * dt;
        u.dir = G.dirOf(dx, dy);
        if (d <= sp) {
          u.px = tx;
          u.py = ty;
          u.c = n.c;
          u.r = n.r;
          u.path.shift();
          if (!u.path.length) {
            const f = u.onArrive;
            u.onArrive = null;
            f && f();
          }
        } else {
          u.px += (dx / d) * sp;
          u.py += (dy / d) * sp;
        }
      } else u.t += dt * 0.5;
    }

    if (phase === 'win' || phase === 'lose') {
      endT += dt;
      if (endT > 1 && (I.tap || I.hit('Enter') || I.hit('Space'))) {
        if (phase === 'win') grow.round++;
        G.save(SAVE_KEY, grow);
        reset();
      }
      return;
    }

    if (I.tap) {
      const p = I.tap;
      const B = ENDBTN;
      if (p.x >= B.x - 4 && p.x <= B.x + B.w + 4 && p.y >= B.y - 4 && p.y <= B.y + B.h + 4) {
        if (!busy && phase === 'me') endTurn();
      } else {
        const c = Math.floor((p.x - OX) / T),
          r = Math.floor((p.y - OY) / T);
        if (inside(c, r)) clickTile(c, r);
        else if (sel && !busy) {
          if (sel.moved) finish(sel);
          else unselect();
        }
      }
    }
    if (I.hit('Escape') && sel && !sel.moved) unselect();
    if (I.hit('KeyE') && !busy && phase === 'me') endTurn();
  }

  const ENDBTN = { x: W - 82, y: H - 34, w: 74, h: 24 };

  // ── 그리기
  function tileRect(ctx, c, r, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(OX + c * T + 1, OY + r * T + 1, T - 2, T - 2);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(OX + c * T + 1.5, OY + r * T + 1.5, T - 3, T - 3);
    }
  }

  function draw(ctx) {
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    G.fx.applyShake(ctx);
    ctx.drawImage(ground, OX, OY);
    // 칸 줄
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(OX + c * T + 0.5, OY);
      ctx.lineTo(OX + c * T + 0.5, OY + ROWS * T);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(OX, OY + r * T + 0.5);
      ctx.lineTo(OX + COLS * T, OY + r * T + 0.5);
      ctx.stroke();
    }

    // 보스 예고 칸
    const pulse = 0.25 + 0.15 * Math.sin(G.time * 8);
    for (const m of marks) tileRect(ctx, m.c, m.r, `rgba(255,50,60,${pulse})`, 'rgba(255,80,80,0.9)');
    if (moveTiles) for (const n of moveTiles) tileRect(ctx, n.c, n.r, 'rgba(80,160,255,0.28)', 'rgba(120,190,255,0.6)');
    if (sel && !sel.moved) for (const e of alive('foe')) if (atkFromHere(e)) tileRect(ctx, e.c, e.r, 'rgba(255,90,60,0.35)', 'rgba(255,120,80,0.9)');
    if (atkTiles) for (const t of atkTiles) tileRect(ctx, t.c, t.r, 'rgba(255,90,60,0.35)', 'rgba(255,120,80,0.9)');

    // 가리키는 칸
    const hc = Math.floor((I.pointer.x - OX) / T),
      hr = Math.floor((I.pointer.y - OY) / T);
    if (inside(hc, hr) && !I.touchUsed) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeRect(OX + hc * T + 0.5, OY + hr * T + 0.5, T - 1, T - 1);
    }

    // 사람 · 장애물(아래에 있을수록 앞에)
    const things = [
      ...units.filter((u) => u.hp > 0).map((u) => ({ y: u.py, u })),
      ...BLOCKS.map(([c, r, k]) => ({ y: OY + r * T + T - 2, b: { c, r, k } })),
    ].sort((a, b) => a.y - b.y);
    for (const th of things) {
      if (th.b) {
        const { c, r, k } = th.b;
        if (k === 'tree') ctx.drawImage(treeImg, OX + c * T, OY + r * T + T - 48);
        else ctx.drawImage(rockImg, OX + c * T + 8, OY + r * T + 10);
        continue;
      }
      const u = th.u;
      G.sprite.shadow(ctx, u.px, u.py, u.boss ? 14 : 9);
      const [lx, ly] = G.dirVec(u.dir);
      const moving = u.path && u.path.length;
      const anim = moving ? 'walk' : 'idle';
      const bob = !G.sprite.has(u.sprite, 'walk') && moving ? -Math.abs(Math.sin(u.t * 12)) * 2 : 0;
      const warn = u.charging ? 0.2 + 0.2 * Math.sin(G.time * 20) : 0;
      G.sprite.draw(ctx, u.sprite, {
        anim,
        dir: u.dir,
        t: u.t,
        fps: moving ? 11 : 5,
        x: u.px + lx * u.lunge * 8,
        y: u.py + ly * u.lunge * 8,
        lift: bob - (u.lift ? 18 : 0),
        scale: u.scale || 1,
        tint: u.tint,
        flash: Math.max(u.flash, warn),
        alpha: u.side === 'me' && u.acted && phase === 'me' ? 0.55 : 1,
      });
      // 머리 위 체력 줄
      const bw = u.boss ? 30 : 18;
      const by = u.py - (u.boss ? 74 : 46);
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(Math.round(u.px - bw / 2) - 1, Math.round(by) - 1, bw + 2, 4);
      ctx.fillStyle = u.side === 'me' ? '#6bff8f' : '#ff5d73';
      ctx.fillRect(Math.round(u.px - bw / 2), Math.round(by), Math.round((bw * Math.max(0, u.hp)) / u.maxHp), 2);
    }
    G.fx.draw(ctx);
    ctx.restore();

    drawPanel(ctx, hc, hr);
  }

  function drawPanel(ctx, hc, hr) {
    // 위: 회차 · 차례
    G.text(ctx, `${grow.round}회차 · ${turn}번째 차례`, OX, 8, { size: 10, bold: true });
    G.text(ctx, phase === 'me' ? '내 차례' : phase === 'foe' ? '적의 차례' : '', OX + 160, 9, { size: 9, color: phase === 'me' ? '#9fe8ff' : '#ffb0b0' });

    // 오른쪽: 보는 사람 정보
    const px = OX + COLS * T + 6,
      pw = W - px - 6;
    const show = sel || (inside(hc, hr) && at(hc, hr)) || units.find((u) => u.id === 'hero');
    if (show) {
      let y = 32;
      G.text(ctx, show.name, px, y, { size: 10, bold: true, color: show.side === 'me' ? '#b8ffb0' : '#ffb0b0' });
      y += 14;
      if (show.side === 'me') {
        const g = grow[show.id];
        G.text(ctx, `Lv ${g.lv}`, px, y, { size: 9, color: '#ffd86b', bold: true });
        ctx.fillStyle = '#3a3040';
        ctx.fillRect(px + 30, y + 3, pw - 32, 3);
        ctx.fillStyle = '#ffd86b';
        ctx.fillRect(px + 30, y + 3, Math.round(((pw - 32) * g.exp) / 100), 3);
        y += 13;
      }
      G.text(ctx, `체력 ${Math.max(0, show.hp)}/${show.maxHp}`, px, y, { size: 9 });
      y += 12;
      G.text(ctx, `공격 ${show.atk}`, px, y, { size: 9 });
      y += 12;
      G.text(ctx, `이동 ${show.move} · 사거리 ${show.range}`, px, y, { size: 9 });
      y += 12;
      if (show.boss) {
        const next = ['보통 공격', '힘 모으기', '내려찍기!'][show.step % 3];
        G.text(ctx, `다음: ${next}`, px, y + 4, { size: 9, color: '#ffb0b0' });
      }
    }
    if (marks.length) {
      G.text(ctx, '빨간 칸 = 다음에', px, 150, { size: 8, color: '#ff9a9a' });
      G.text(ctx, '내려찍는 자리', px, 161, { size: 8, color: '#ff9a9a' });
    }

    // 턴 끝 버튼
    const b = ENDBTN;
    const on = phase === 'me' && !busy;
    ctx.fillStyle = on ? '#4a3a68' : '#2a2434';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = on ? '#9fe8ff' : '#4a4058';
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    G.text(ctx, '차례 끝', b.x + b.w / 2, b.y + b.h / 2, { align: 'center', base: 'middle', size: 10, color: on ? '#fff' : '#777' });

    // 안내 글
    if (msg && msg.t < 2) {
      const a = msg.t < 0.2 ? msg.t / 0.2 : msg.t > 1.6 ? (2 - msg.t) / 0.4 : 1;
      G.text(ctx, msg.a, OX + (COLS * T) / 2, 100, { align: 'center', size: 18, bold: true, alpha: a, color: '#ffe9a8' });
      if (msg.b) G.text(ctx, msg.b, OX + (COLS * T) / 2, 124, { align: 'center', size: 10, alpha: a });
    }

    if (phase === 'win' || phase === 'lose') {
      ctx.fillStyle = 'rgba(20,14,28,0.6)';
      ctx.fillRect(0, 0, W, H);
      const lv = `주인공 Lv ${grow.hero.lv} · 동료 Lv ${grow.ally.lv}`;
      if (phase === 'win') {
        G.text(ctx, '이겼다!', W / 2, 80, { align: 'center', size: 22, bold: true, color: '#ffd86b' });
        G.text(ctx, `${turn}번째 차례에 끝냄 · ${lv}`, W / 2, 112, { align: 'center', size: 11 });
        G.text(ctx, '다음 회차는 레벨 그대로, 적도 그대로', W / 2, 132, { align: 'center', size: 9, color: '#d8d0e0' });
      } else {
        G.text(ctx, '주인공이 쓰러졌다', W / 2, 80, { align: 'center', size: 22, bold: true, color: '#ff8a9a' });
        G.text(ctx, `${lv} — 레벨은 남는다`, W / 2, 112, { align: 'center', size: 11 });
      }
      if (endT > 1) G.text(ctx, '눌러서 계속', W / 2, 170, { align: 'center', size: 10, alpha: 0.6 + 0.4 * Math.sin(G.time * 5) });
    }
  }

  reset();
  G.start({ w: W, h: H, update, draw });
})();
