// 바닥: 16칸 타일을 깔고 풀 · 돌을 흩뿌린 한 장을 미리 그려 둔다(매 프레임 다시 그리지 않음).
//   const g = G.ground.make(w, h, { seed, deco: 0.08 })   그릴 때 ctx.drawImage(g, x, y)
//   타일 그림은 길가식당 art/raw 에서 가져옴(assets/ 에 복사)
(function () {
  const GR = (G.ground = {});

  // 같은 seed면 같은 모양(다시 그려도 바닥이 바뀌지 않게)
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  GR.make = function (w, h, o = {}) {
    const base = G.groundBase || 'assets/';
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    const r = rng(o.seed || 7);
    const grass = G.img(base + 'grass_base.png');
    const floor = [G.img(base + 'forest_floor_0.png'), G.img(base + 'forest_floor_1.png')];
    const deco = [G.img(base + 'bush_0.png'), G.img(base + 'rock_0.png'), G.img(base + 'rock_1.png')];
    const draw = () => {
      for (let ty = 0; ty < h; ty += 16)
        for (let tx = 0; tx < w; tx += 16) x.drawImage(r() < (o.patch || 0.12) ? floor[Math.floor(r() * 2)] : grass, tx, ty);
      for (let ty = 0; ty < h; ty += 16)
        for (let tx = 0; tx < w; tx += 16) if (r() < (o.deco ?? 0.04)) x.drawImage(deco[Math.floor(r() * deco.length)], tx, ty);
    };
    // 그림이 아직 안 불러졌으면 불러진 뒤에 그린다
    const imgs = [grass, ...floor, ...deco];
    const tryDraw = () => {
      if (!imgs.every((im) => im.complete && im.naturalWidth)) return setTimeout(tryDraw, 30);
      draw();
      if (o.onDone) o.onDone(c); // 3D는 다 그린 뒤 질감을 새로 올려야 한다
    };
    tryDraw();
    return c;
  };
})();
