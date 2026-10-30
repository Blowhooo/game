// 맛보기 ① 실시간 액션 · 2D 그리기. 규칙은 logic.js, 화면 위 글자 · 막대는 hud.js
(function () {
  const { W, H, WORLD, WAVES, grow, needExp, stats, weaponColor, telegraphing } = ACT;
  const I = G.input;
  let P, enemies, shots, slashes, boss, phase, waveNo, hitCount, banner, endT;
  const refresh = () => ({ P, enemies, shots, slashes, boss, phase, waveNo, hitCount, banner, endT } = ACT.get());
  const ground = G.ground.make(WORLD.w, WORLD.h, { seed: 3, deco: 0.015, patch: 0.02 });

  function draw(ctx) {
    refresh();
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

    ACT.drawHud(ctx);
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


  G.start({ w: W, h: H, update: ACT.step, draw });
})();
