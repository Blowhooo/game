// 손맛 효과: 떠오르는 숫자 · 튀는 조각 · 화면 흔들림 · 멈칫(맞는 순간 아주 잠깐 멈춤).
//   G.fx.num(x, y, '12', { color, size })   G.fx.burst(x, y, color, n)
//   G.fx.shake(세기)   G.fx.stop(초)   G.fx.update(dt) → 멈칫 중이면 false
//   그릴 때: G.fx.applyShake(ctx) 후 월드, G.fx.draw(ctx[, 월드→화면 함수])
(function () {
  const F = (G.fx = {});
  let items = [];
  let parts = [];
  let shakeAmt = 0;
  let stopT = 0;

  F.num = function (x, y, str, o = {}) {
    items.push({ x, y, str, t: 0, life: o.life || 0.8, color: o.color || '#fff', size: o.size || 10 });
  };
  F.burst = function (x, y, color, n = 8, speed = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0, life: 0.35 + Math.random() * 0.25, color, r: 1 + Math.random() * 1.5 });
    }
  };
  F.shake = (a) => (shakeAmt = Math.max(shakeAmt, a));
  F.stop = (s) => (stopT = Math.max(stopT, s));
  F.clear = () => {
    items = [];
    parts = [];
    shakeAmt = 0;
    stopT = 0;
  };

  F.update = function (dt) {
    shakeAmt = Math.max(0, shakeAmt - dt * 30);
    for (const it of items) it.t += dt;
    items = items.filter((it) => it.t < it.life);
    for (const p of parts) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
    }
    parts = parts.filter((p) => p.t < p.life);
    if (stopT > 0) {
      stopT -= dt;
      return false;
    }
    return true;
  };

  F.shakeOffset = () => (shakeAmt > 0 ? [G.rand(-shakeAmt, shakeAmt), G.rand(-shakeAmt, shakeAmt)] : [0, 0]);
  F.applyShake = function (ctx) {
    if (shakeAmt > 0) ctx.translate(Math.round(G.rand(-shakeAmt, shakeAmt)), Math.round(G.rand(-shakeAmt, shakeAmt)));
  };

  // map: 월드 좌표 → 화면 좌표로 바꾸는 함수(3D에서 씀). 없으면 그대로
  F.draw = function (ctx, map) {
    const at = map || ((x, y) => [x, y]);
    for (const p of parts) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.color;
      const [sx, sy] = at(p.x, p.y);
      ctx.fillRect(Math.round(sx), Math.round(sy), Math.ceil(p.r), Math.ceil(p.r));
    }
    ctx.globalAlpha = 1;
    for (const it of items) {
      const k = it.t / it.life;
      const pop = k < 0.15 ? 1 + (0.15 - k) * 3 : 1;
      const [sx, sy] = at(it.x, it.y);
      G.text(ctx, it.str, sx, sy - 18 * Math.min(1, k * 2.5), {
        align: 'center',
        size: Math.round(it.size * pop),
        color: it.color,
        bold: true,
        alpha: k > 0.7 ? (1 - k) / 0.3 : 1,
      });
    }
  };
})();
