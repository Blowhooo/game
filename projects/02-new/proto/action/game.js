// 맛보기 ① 실시간 액션 — 잡몹 무리를 쓸고, 패턴이 정해진 큰 보스를 푼다. 레벨은 회차를 넘어 이어진다.
// 숫자는 전부 임시(느낌 보기용). 주소 뒤 ?new 처음부터 · ?boss 바로 보스. 조작: 이동 WASD/화살표 · 공격 J · 구르기 K/Space · 회전베기 L(레벨 3부터)
(function () {
  const W = 480,
    H = 270;
  const WORLD = { w: 720, h: 432 };
  const SAVE_KEY = 'proto-action';
  if (location.search.includes('new')) localStorage.removeItem(SAVE_KEY);

  const I = G.input;
  const ground = G.ground.make(WORLD.w, WORLD.h, { seed: 3, deco: 0.015, patch: 0.02 });

  // ── 성장(회차를 넘어 남는 것)
  const grow = G.load(SAVE_KEY, { lv: 1, exp: 0, round: 1, best: null });
  const needExp = (lv) => 4 + lv * 4;
  const stats = () => ({
    maxHp: 4 + grow.lv,
    atk: 1 + grow.lv,
    reach: 26 + Math.floor(grow.lv / 2) * 5, // 무기가 자람: 베는 범위
    spin: grow.lv >= 3, // 새 기술
    wave: grow.lv >= 5, // 셋째 칼에 검기
    aura: grow.lv >= 5, // 겉모습
  });
  const weaponColor = () => (grow.lv >= 7 ? '#ffd86b' : grow.lv >= 4 ? '#9fe8ff' : '#ffffff');

  // ── 상태
  let P, enemies, shots, slashes, phase, waveNo, waveLeft, spawnT, boss, hitCount, banner, endT;

  function reset() {
    const st = stats();
    P = { x: WORLD.w / 2, y: WORLD.h / 2 + 40, hp: st.maxHp, dir: 'south', moving: false, t: 0, atkT: 0, combo: 0, comboT: 0, dodgeT: 0, dodgeCd: 0, invT: 0, spinCd: 0, flash: 0, vx: 0, vy: 0 };
    enemies = [];
    shots = [];
    slashes = [];
    boss = null;
    hitCount = 0;
    waveNo = 0;
    phase = 'waves';
    nextWave();
    G.fx.clear();
    showBanner(`${grow.round}회차`, '레벨 ' + grow.lv);
    if (location.search.includes('boss')) {
      waveNo = WAVES.length; // ?boss: 바로 보스(시험용)
      waveLeft = 0;
      spawnBoss();
    }
  }

  const WAVES = [6, 10, 14];
  function nextWave() {
    waveNo++;
    waveLeft = WAVES[waveNo - 1];
    spawnT = 0.5;
    if (waveNo > 1) showBanner(`무리 ${waveNo}`, '');
  }
  function showBanner(a, b) {
    banner = { a, b, t: 0 };
  }

  function spawnMinion(x, y) {
    if (x == null) {
      // 화면 밖 가장자리에서
      const side = Math.floor(Math.random() * 4);
      x = side === 0 ? -20 : side === 1 ? WORLD.w + 20 : G.rand(0, WORLD.w);
      y = side === 2 ? -20 : side === 3 ? WORLD.h + 20 : G.rand(0, WORLD.h);
    }
    enemies.push({ kind: 'minion', x, y, hp: 4, maxHp: 4, speed: G.rand(38, 55), r: 9, dir: 'south', t: Math.random(), flash: 0, kx: 0, ky: 0, hurtT: 0 });
  }

  function spawnBoss() {
    boss = { kind: 'boss', x: WORLD.w / 2, y: 90, hp: 70, maxHp: 70, r: 22, dir: 'south', t: 0, flash: 0, kx: 0, ky: 0, hurtT: 0, state: 'enter', st: 0, step: 0, lift: 0, called: false };
    enemies.push(boss);
    phase = 'boss';
    hitCount = 0;
    showBanner('큰 녀석', '패턴을 읽어라');
  }

  // ── 플레이어 맞음
  function hurtPlayer(dmg, fromX, fromY) {
    if (P.invT > 0 || P.dodgeT > 0 || phase === 'clear' || phase === 'dead') return;
    P.hp -= dmg;
    P.invT = 0.9;
    P.flash = 1;
    hitCount++;
    const l = G.dist(fromX, fromY, P.x, P.y) || 1;
    P.vx = ((P.x - fromX) / l) * 160;
    P.vy = ((P.y - fromY) / l) * 160;
    G.fx.shake(4);
    G.fx.stop(0.06);
    G.fx.num(P.x, P.y - 40, '-' + dmg, { color: '#ff6b6b', size: 11 });
    if (P.hp <= 0) {
      phase = 'dead';
      endT = 0;
      G.save(SAVE_KEY, grow);
    }
  }

  // ── 적 맞음
  function hurtEnemy(e, dmg, fromX, fromY, push) {
    if (e.hurtT > 0) return;
    e.hp -= dmg;
    e.hurtT = 0.12;
    e.flash = 1;
    const l = G.dist(fromX, fromY, e.x, e.y) || 1;
    const k = e.kind === 'boss' ? push * 0.15 : push;
    e.kx = ((e.x - fromX) / l) * k;
    e.ky = ((e.y - fromY) / l) * k;
    G.fx.num(e.x, e.y - (e.kind === 'boss' ? 90 : 40), String(dmg), { color: '#fff3a0' });
    G.fx.burst(e.x, e.y - 16, '#fff3a0', 5);
    G.fx.stop(0.035);
    if (e.hp <= 0) {
      e.dead = true;
      G.fx.burst(e.x, e.y - 16, '#b69cff', e.kind === 'boss' ? 40 : 12, e.kind === 'boss' ? 160 : 100);
      G.fx.shake(e.kind === 'boss' ? 8 : 2);
      gainExp(e.kind === 'boss' ? 30 : 1, e.x, e.y);
      if (e.kind === 'boss') {
        phase = 'clear';
        endT = 0;
        enemies.forEach((m) => (m.dead = true));
        shots = [];
        const nohit = hitCount === 0;
        grow.best = grow.best == null ? hitCount : Math.min(grow.best, hitCount);
        G.fx.num(e.x, e.y - 60, nohit ? '노히트!' : '쓰러뜨림!', { color: '#ffd86b', size: 16, life: 2 });
      }
    }
  }

  function gainExp(n, x, y) {
    grow.exp += n;
    while (grow.exp >= needExp(grow.lv)) {
      grow.exp -= needExp(grow.lv);
      const before = stats();
      grow.lv++;
      const after = stats();
      P.hp = after.maxHp;
      G.fx.num(P.x, P.y - 52, '레벨 업!', { color: '#ffd86b', size: 13, life: 1.4 });
      G.fx.burst(P.x, P.y - 20, '#ffd86b', 24, 130);
      if (after.spin && !before.spin) showBanner('새 기술', '회전베기 (L)');
      else if (after.wave && !before.wave) showBanner('칼이 빛난다', '셋째 칼에 검기');
      else if (after.reach > before.reach) G.fx.num(P.x, P.y - 66, '무기가 자람', { color: '#9fe8ff', size: 9, life: 1.4 });
    }
    G.save(SAVE_KEY, grow);
  }

  // ── 공격
  function startSlash(kind) {
    const st = stats();
    const [dx, dy] = G.dirVec(P.dir);
    const s = { kind, t: 0, life: 0.14, ang: Math.atan2(dy, dx), hitSet: new Set() };
    if (kind === 'spin') {
      s.reach = st.reach + 14;
      s.arc = Math.PI * 2;
      s.dmg = st.atk + 1;
      s.push = 140;
      s.life = 0.25;
    } else {
      const third = kind === 3;
      s.reach = st.reach + (third ? 8 : 0);
      s.arc = third ? Math.PI * 0.9 : Math.PI * 0.7;
      s.dmg = st.atk + (third ? 1 : 0);
      s.push = third ? 170 : 70;
      P.vx += dx * (third ? 150 : 80);
      P.vy += dy * (third ? 150 : 80);
      if (third && st.wave) shots.push({ mine: true, x: P.x + dx * 10, y: P.y - 14 + dy * 10, vx: dx * 260, vy: dy * 260, r: 10, dmg: st.atk, life: 0.6, hitSet: new Set() });
    }
    slashes.push(s);
  }

  function inSlash(s, e) {
    const cx = P.x,
      cy = P.y - 14;
    const ex = e.x,
      ey = e.y - (e.kind === 'boss' ? 30 : 14);
    const d = G.dist(cx, cy, ex, ey);
    if (d > s.reach + e.r) return false;
    if (s.arc >= Math.PI * 2) return true;
    let da = Math.atan2(ey - cy, ex - cx) - s.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    return Math.abs(da) <= s.arc / 2 + 0.25 || d < e.r + 6;
  }

  // ── 보스 패턴(정해진 순서로 돈다 → 익히면 안 맞을 수 있다)
  const ORDER = ['charge', 'slam', 'ring', 'charge', 'ring', 'slam'];
  function bossUpdate(b, dt) {
    const fast = b.hp < b.maxHp / 2 ? 0.75 : 1; // 반 아래면 예고가 짧아짐
    b.st += dt;
    const toP = Math.atan2(P.y - b.y, P.x - b.x);
    switch (b.state) {
      case 'enter':
        b.y += 30 * dt;
        if (b.st > 1.5) nextState(b, 'walk');
        break;
      case 'walk': // 틈: 이때 때린다
        b.dir = G.dirOf(Math.cos(toP), Math.sin(toP));
        b.x += Math.cos(toP) * 30 * dt;
        b.y += Math.sin(toP) * 30 * dt;
        if (b.st > 1.6 * fast) {
          if (!b.called && b.hp < b.maxHp / 2) {
            b.called = true;
            for (let i = 0; i < 4; i++) spawnMinion();
            G.fx.num(b.x, b.y - 100, '부하를 부른다', { color: '#ffb0b0', size: 10, life: 1.4 });
          }
          nextState(b, ORDER[b.step++ % ORDER.length]);
        }
        break;
      case 'charge':
        if (b.st < dt * 1.5) {
          b.cang = toP;
          b.dir = G.dirOf(Math.cos(toP), Math.sin(toP));
        }
        if (b.st > 0.85 * fast) {
          b.x += Math.cos(b.cang) * 390 * dt;
          b.y += Math.sin(b.cang) * 390 * dt;
          if (G.dist(b.x, b.y, P.x, P.y) < b.r + 10) hurtPlayer(2, b.x, b.y);
          const out = b.x < 30 || b.x > WORLD.w - 30 || b.y < 50 || b.y > WORLD.h - 10;
          if (out || b.st > 0.85 * fast + 0.7) {
            b.x = G.clamp(b.x, 30, WORLD.w - 30);
            b.y = G.clamp(b.y, 50, WORLD.h - 10);
            if (out) G.fx.shake(5);
            nextState(b, 'walk');
          }
        }
        break;
      case 'slam':
        if (b.st < dt * 1.5) {
          b.tx = P.x;
          b.ty = P.y;
          b.sx = b.x;
          b.sy = b.y;
        }
        {
          const T = 1.1 * fast;
          const k = Math.min(1, b.st / T);
          b.x = b.sx + (b.tx - b.sx) * k;
          b.y = b.sy + (b.ty - b.sy) * k;
          b.lift = -Math.sin(k * Math.PI) * 70;
          if (b.st >= T && !b.landed) {
            b.landed = true;
            b.lift = 0;
            G.fx.shake(8);
            G.fx.burst(b.x, b.y, '#c9b38f', 30, 150);
            if (G.dist(b.x, b.y, P.x, P.y) < 54) hurtPlayer(2, b.x, b.y);
          }
          if (b.st > T + 0.5) {
            b.landed = false;
            nextState(b, 'walk');
          }
        }
        break;
      case 'ring':
        if (b.st > 0.6 * fast && !b.fired) b.fired = 0;
        if (b.fired != null && b.fired !== true) {
          const want = Math.floor((b.st - 0.6 * fast) / 0.45) + 1;
          while (b.fired < Math.min(3, want)) {
            const n = 14;
            const off = b.fired * (Math.PI / n);
            for (let i = 0; i < n; i++) {
              const a = off + (i / n) * Math.PI * 2;
              shots.push({ x: b.x, y: b.y - 30, vx: Math.cos(a) * 85, vy: Math.sin(a) * 85, r: 4, dmg: 1, life: 6 });
            }
            b.fired++;
          }
          if (b.fired >= 3) b.fired = true;
        }
        if (b.st > 2.4 * fast) {
          b.fired = null;
          nextState(b, 'walk');
        }
        break;
    }
  }
  function nextState(b, s) {
    b.state = s;
    b.st = 0;
  }

  // ── 반복
  function update(dt) {
    if (!G.fx.update(dt)) return; // 멈칫
    if (banner) banner.t += dt;
    const st = stats();

    if (phase === 'clear' || phase === 'dead') {
      endT += dt;
      if (endT > 1 && (I.tap || I.hit('Enter') || I.hit('Space') || I.btnHit('attack'))) {
        if (phase === 'clear') grow.round++;
        G.save(SAVE_KEY, grow);
        reset();
      }
      for (const s of slashes) s.t += dt;
      slashes = slashes.filter((s) => s.t < s.life);
      return;
    }

    // 플레이어
    P.t += dt;
    P.invT -= dt;
    P.flash = Math.max(0, P.flash - dt * 5);
    P.dodgeCd -= dt;
    P.spinCd -= dt;
    P.atkT -= dt;
    P.comboT -= dt;
    const mv = I.move();
    P.moving = !!(mv.x || mv.y);
    if (P.moving && P.atkT <= 0) P.dir = G.dirOf(mv.x, mv.y);

    if (P.dodgeT > 0) {
      P.dodgeT -= dt;
    } else if (I.btnHit('dodge') && P.dodgeCd <= 0) {
      const [dx, dy] = P.moving ? [mv.x, mv.y] : G.dirVec(P.dir);
      P.vx = dx * 300;
      P.vy = dy * 300;
      P.dodgeT = 0.2;
      P.dodgeCd = 0.45;
    }
    if (I.btnHit('attack') && P.atkT <= 0.06 && P.dodgeT <= 0) {
      P.combo = P.comboT > 0 ? (P.combo % 3) + 1 : 1;
      P.atkT = P.combo === 3 ? 0.34 : 0.2;
      P.comboT = P.atkT + 0.3;
      startSlash(P.combo);
    }
    if (st.spin && I.btnHit('spin') && P.spinCd <= 0 && P.dodgeT <= 0) {
      P.spinCd = 2.5;
      P.atkT = 0.3;
      startSlash('spin');
      G.fx.shake(2);
    }

    const sp = P.atkT > 0 ? 35 : 95;
    if (P.dodgeT <= 0) {
      P.vx *= Math.pow(0.0005, dt);
      P.vy *= Math.pow(0.0005, dt);
    }
    P.x += (P.dodgeT > 0 ? 0 : mv.x * sp) * dt + P.vx * dt;
    P.y += (P.dodgeT > 0 ? 0 : mv.y * sp) * dt + P.vy * dt;
    P.x = G.clamp(P.x, 12, WORLD.w - 12);
    P.y = G.clamp(P.y, 40, WORLD.h - 4);
    if (P.dodgeT > 0 && Math.random() < 0.6) G.fx.burst(P.x, P.y - 4, '#d9cba8', 1, 20);
    if (st.aura && Math.random() < 0.25) G.fx.burst(P.x + G.rand(-8, 8), P.y - G.rand(4, 36), '#ffd86b', 1, 15);

    // 베기 판정
    for (const s of slashes) {
      s.t += dt;
      for (const e of enemies) {
        if (e.dead || s.hitSet.has(e)) continue;
        if (inSlash(s, e)) {
          s.hitSet.add(e);
          hurtEnemy(e, s.dmg, P.x, P.y, s.push);
        }
      }
    }
    slashes = slashes.filter((s) => s.t < s.life);

    // 웨이브
    if (phase === 'waves') {
      spawnT -= dt;
      if (waveLeft > 0 && spawnT <= 0) {
        spawnMinion();
        waveLeft--;
        spawnT = 0.35;
      }
      if (waveLeft === 0 && enemies.every((e) => e.dead)) {
        if (waveNo < WAVES.length) nextWave();
        else spawnBoss();
      }
    }

    // 적
    for (const e of enemies) {
      if (e.dead) continue;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt * 6);
      e.hurtT -= dt;
      e.x += e.kx * dt;
      e.y += e.ky * dt;
      e.kx *= Math.pow(0.002, dt);
      e.ky *= Math.pow(0.002, dt);
      if (e.kind === 'boss') bossUpdate(e, dt);
      else {
        const a = Math.atan2(P.y - e.y, P.x - e.x);
        if (e.hurtT < -0.15) {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
        }
        e.dir = G.dirOf(Math.cos(a), Math.sin(a));
        if (G.dist(e.x, e.y, P.x, P.y) < e.r + 8) hurtPlayer(1, e.x, e.y);
      }
    }
    // 잡몹끼리 겹치지 않게 살짝 밀기
    for (let i = 0; i < enemies.length; i++)
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i],
          b = enemies[j];
        if (a.dead || b.dead || a.kind === 'boss' || b.kind === 'boss') continue;
        const d = G.dist(a.x, a.y, b.x, b.y);
        if (d > 0 && d < 16) {
          const p = ((16 - d) / d) * 0.5;
          a.x -= (b.x - a.x) * p;
          a.y -= (b.y - a.y) * p;
          b.x += (b.x - a.x) * p;
          b.y += (b.y - a.y) * p;
        }
      }
    enemies = enemies.filter((e) => !e.dead);

    // 탄
    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.mine) {
        for (const e of enemies)
          if (!s.hitSet.has(e) && G.dist(s.x, s.y, e.x, e.y - 14) < s.r + e.r) {
            s.hitSet.add(e);
            hurtEnemy(e, s.dmg, s.x - s.vx, s.y - s.vy, 90);
          }
      } else if (G.dist(s.x, s.y, P.x, P.y - 12) < s.r + 6) {
        hurtPlayer(s.dmg, s.x, s.y);
        s.life = 0;
      }
    }
    shots = shots.filter((s) => s.life > 0 && s.x > -20 && s.x < WORLD.w + 20 && s.y > -20 && s.y < WORLD.h + 20);
  }

  // ── 그리기
  function draw(ctx) {
    const cam = { x: G.clamp(P.x - W / 2, 0, WORLD.w - W), y: G.clamp(P.y - 20 - H / 2, 0, WORLD.h - H) };
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    G.fx.applyShake(ctx);
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    ctx.drawImage(ground, 0, 0);

    // 보스 예고(바닥에)
    if (boss && !boss.dead) drawTelegraph(ctx, boss);

    // 사람들(아래에 있을수록 앞에)
    const list = [...enemies, P].sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === P) drawPlayer(ctx);
      else drawEnemy(ctx, e);
    }

    for (const s of slashes) drawSlash(ctx, s);
    for (const s of shots) {
      ctx.fillStyle = s.mine ? weaponColor() : '#ff4f6d';
      ctx.globalAlpha = s.mine ? 0.8 : 1;
      ctx.beginPath();
      ctx.arc(Math.round(s.x), Math.round(s.y), s.r, 0, Math.PI * 2);
      ctx.fill();
      if (!s.mine) {
        ctx.fillStyle = '#ffd0d8';
        ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    G.fx.draw(ctx);
    ctx.restore();

    drawHud(ctx);
    I.drawTouch(ctx);
  }

  function drawPlayer(ctx) {
    const st = stats();
    G.sprite.shadow(ctx, P.x, P.y, 9);
    if (P.invT > 0 && Math.floor(P.invT * 20) % 2 === 0 && P.flash < 0.5) return; // 무적 중 깜빡임
    const anim = P.moving && P.atkT <= 0 ? 'walk' : 'idle';
    const tint = st.aura ? `rgba(255,220,120,${0.12 + 0.08 * Math.sin(G.time * 6)})` : null;
    G.sprite.draw(ctx, 'hero', { anim, dir: P.dir, t: P.t, x: P.x, y: P.y, fps: anim === 'walk' ? 11 : 5, tint, flash: P.flash, alpha: P.dodgeT > 0 ? 0.6 : 1 });
  }

  function drawEnemy(ctx, e) {
    const isBoss = e.kind === 'boss';
    const sc = isBoss ? 2.1 : 0.85;
    G.sprite.shadow(ctx, e.x, e.y, isBoss ? 24 + (e.lift || 0) * 0.1 : 8);
    const bob = isBoss ? 0 : Math.abs(Math.sin(e.t * 9)) * -2; // 걷는 척 통통
    const warn = isBoss && telegraphing(e) ? 0.25 + 0.25 * Math.sin(G.time * 30) : 0;
    G.sprite.draw(ctx, 'man', {
      dir: e.dir,
      x: e.x,
      y: e.y,
      scale: sc,
      lift: (e.lift || 0) + bob,
      tint: isBoss ? 'rgba(150,20,30,0.45)' : 'rgba(45,25,70,0.6)',
      flash: Math.max(e.flash, warn),
    });
    if (!isBoss && e.hp < e.maxHp) {
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.round(e.x - 8), Math.round(e.y - 44), 16, 2);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(Math.round(e.x - 8), Math.round(e.y - 44), Math.round((16 * e.hp) / e.maxHp), 2);
    }
  }

  function telegraphing(b) {
    if (b.state === 'charge') return b.st <= 0.85 * (b.hp < b.maxHp / 2 ? 0.75 : 1);
    if (b.state === 'ring') return b.fired == null;
    return false;
  }

  function drawTelegraph(ctx, b) {
    const fast = b.hp < b.maxHp / 2 ? 0.75 : 1;
    ctx.save();
    if (b.state === 'charge' && b.st <= 0.85 * fast && b.cang != null) {
      const k = b.st / (0.85 * fast);
      ctx.translate(b.x, b.y - 6);
      ctx.rotate(b.cang);
      ctx.fillStyle = `rgba(255,60,60,${0.15 + 0.25 * k})`;
      ctx.fillRect(0, -b.r, 420, b.r * 2);
      ctx.fillStyle = 'rgba(255,60,60,0.6)';
      ctx.fillRect(0, -b.r, 420 * k, 2);
      ctx.fillRect(0, b.r - 2, 420 * k, 2);
    }
    if (b.state === 'slam' && b.tx != null && !b.landed) {
      const k = Math.min(1, b.st / (1.1 * fast));
      ctx.strokeStyle = 'rgba(255,60,60,0.8)';
      ctx.fillStyle = `rgba(255,60,60,${0.12 + 0.2 * k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(b.tx, b.ty, 54, 54 * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(b.tx, b.ty, 54 * k, 54 * 0.55 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSlash(ctx, s) {
    const k = s.t / s.life;
    const cx = P.x,
      cy = P.y - 14;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = weaponColor();
    ctx.lineCap = 'round';
    if (s.arc >= Math.PI * 2) {
      ctx.lineWidth = 6 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(cx, cy, s.reach * (0.6 + 0.4 * k), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 휘두르는 궤적: 시작각 → 끝각으로 번지는 초승달
      const a0 = s.ang - s.arc / 2,
        a1 = a0 + s.arc * Math.min(1, k * 2.2);
      ctx.lineWidth = s.kind === 3 ? 7 : 5;
      ctx.beginPath();
      ctx.arc(cx, cy, s.reach - 4, a0, a1);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, s.reach - 12, a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function bar(ctx, x, y, w, h, k, color) {
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.round(w * G.clamp(k, 0, 1)), h);
  }

  function drawHud(ctx) {
    const st = stats();
    // 왼쪽 위: 체력 · 레벨 · 경험치
    for (let i = 0; i < st.maxHp; i++) {
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(8 + i * 11, 8, 10, 9);
      ctx.fillStyle = i < P.hp ? '#ff5d73' : '#4a3a48';
      ctx.fillRect(9 + i * 11, 9, 8, 7);
    }
    G.text(ctx, `Lv ${grow.lv}`, 8, 21, { size: 10, bold: true, color: '#ffd86b' });
    bar(ctx, 40, 24, 70, 4, grow.exp / needExp(grow.lv), '#ffd86b');
    G.text(ctx, `공격 ${st.atk} · 범위 ${st.reach}`, 8, 34, { size: 8, color: '#d8d0e0' });
    if (st.spin) G.text(ctx, P.spinCd > 0 ? `회전베기 ${P.spinCd.toFixed(1)}` : '회전베기 준비(L)', 8, 45, { size: 8, color: P.spinCd > 0 ? '#9a90a8' : '#9fe8ff' });

    // 오른쪽 위: 회차 · 진행
    G.text(ctx, `${grow.round}회차`, W - 8, 8, { align: 'right', size: 10, bold: true });
    G.text(ctx, phase === 'waves' ? `무리 ${waveNo}/${WAVES.length}` : '큰 녀석', W - 8, 21, { align: 'right', size: 8, color: '#d8d0e0' });
    if (grow.best != null) G.text(ctx, `최소 맞음 ${grow.best}`, W - 8, 32, { align: 'right', size: 8, color: '#d8d0e0' });

    // 보스 체력 · 맞은 횟수
    if (boss && phase !== 'waves') {
      bar(ctx, W / 2 - 100, H - 16, 200, 6, boss.hp / boss.maxHp, '#ff4f6d');
      G.text(ctx, `맞은 횟수 ${hitCount}`, W / 2, H - 30, { align: 'center', size: 9, color: hitCount ? '#ffb0b0' : '#b8ffb0' });
    }

    if (banner && banner.t < 2) {
      const a = banner.t < 0.2 ? banner.t / 0.2 : banner.t > 1.6 ? (2 - banner.t) / 0.4 : 1;
      G.text(ctx, banner.a, W / 2, 70, { align: 'center', size: 20, bold: true, alpha: a, color: '#ffe9a8' });
      if (banner.b) G.text(ctx, banner.b, W / 2, 96, { align: 'center', size: 10, alpha: a });
    }

    if (phase === 'clear' || phase === 'dead') {
      ctx.fillStyle = 'rgba(20,14,28,0.6)';
      ctx.fillRect(0, 0, W, H);
      if (phase === 'clear') {
        G.text(ctx, hitCount === 0 ? '노히트 클리어!' : '클리어!', W / 2, 80, { align: 'center', size: 22, bold: true, color: '#ffd86b' });
        G.text(ctx, `맞은 횟수 ${hitCount}   ·   레벨 ${grow.lv}`, W / 2, 112, { align: 'center', size: 11 });
        G.text(ctx, '다음 회차는 레벨 그대로, 적도 그대로', W / 2, 132, { align: 'center', size: 9, color: '#d8d0e0' });
      } else {
        G.text(ctx, '쓰러졌다', W / 2, 80, { align: 'center', size: 22, bold: true, color: '#ff8a9a' });
        G.text(ctx, `레벨 ${grow.lv}은 남는다. 다시 해 보자`, W / 2, 112, { align: 'center', size: 11 });
      }
      if (endT > 1) G.text(ctx, I.touchUsed ? '눌러서 계속' : '누르거나 Enter', W / 2, 170, { align: 'center', size: 10, alpha: 0.6 + 0.4 * Math.sin(G.time * 5) });
    }
  }

  // ── 시작
  I.useStick(true);
  const BTNS = [
    { id: 'attack', label: '공격', x: W - 42, y: H - 46, r: 24, keys: ['KeyJ', 'KeyZ'] },
    { id: 'dodge', label: '구르기', x: W - 96, y: H - 28, r: 17, keys: ['KeyK', 'Space', 'KeyX'] },
    { id: 'spin', label: '회전', x: W - 52, y: H - 104, r: 17, keys: ['KeyL', 'KeyC'] },
  ];
  I.setButtons(BTNS);
  reset();
  G.start({
    w: W,
    h: H,
    update(dt) {
      BTNS[2].hidden = !stats().spin; // 회전 버튼은 배운 뒤에만 보인다
      update(dt);
    },
    draw,
  });
})();
