// 견본: 솜씨(0 → 1)에 따라 같은 집이 어떻게 달라지는지. 좌우 화살표 · 끌기로 둘러보기
(function () {
  const W = 480,
    H = 270;
  const TYPES = ['hut', 'house', 'house2', 'shed', 'workshop', 'well', 'tower', 'fence'];
  const QS = [0, 0.35, 0.65, 1];
  const I = G.input;
  let camX = 200;
  G.start({
    w: W,
    h: H,
    update(dt) {
      const m = I.move();
      camX = G.clamp(camX + m.x * 300 * dt, 60, 140 * TYPES.length - 60);
      G.w3d.follow(camX, 230);
    },
    draw(ctx) {
      G.w3d.render(ctx);
      QS.forEach((q, i) => {
        const [sx, sy] = G.w3d.toScreen(camX - 230, 0, 60 + i * 110);
        G.text(ctx, '솜씨 ' + Math.round(q * 100), 8, sy - 6, { size: 9, bold: true, color: '#ffe9a8' });
      });
      TYPES.forEach((t, k) => {
        const [sx, sy] = G.w3d.toScreen(60 + k * 140, 0, 420);
        G.text(ctx, G.build.NAME[t], sx, Math.min(H - 14, sy), { align: 'center', size: 9 });
      });
      G.text(ctx, '← → 로 둘러보기', W - 8, 8, { align: 'right', size: 8, color: '#ddd' });
    },
  });
  G.w3d.init({ pitch: 0.75, dist: 620 });
  G.w3d.ground(140 * TYPES.length, 460, { seed: 9 });
  TYPES.forEach((t, k) =>
    QS.forEach((q, i) => {
      const b = G.build.make(t, { q, seed: k * 10 + i + 1 });
      b.position.set(60 + k * 140, 0, 60 + i * 110);
      G.w3d.scene.add(b);
    })
  );
  G.w3d.follow(camX, 230, true);
})();
