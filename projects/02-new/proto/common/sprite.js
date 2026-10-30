// 캐릭터 그리기: assets/<이름>.png + <이름>.js(자리표, shared/tools/pixellab_sheet.py가 만듦).
// G.sprite.draw(ctx, '이름', { anim, dir, t, x, y, scale, tint, flash, alpha })
//   x, y = 발 위치. 동작이 없거나 그 방향이 없으면 'stand'(멈춘 모습)으로, 그것도 없으면 가까운 방향으로.
(function () {
  const S = (G.sprite = {});
  let base = 'assets/';
  S.base = (b) => (base = b);

  const tinted = {}; // '이름|색' → 색을 입힌 그림(캔버스)

  function sheetImg(name, tint) {
    const img = G.img(base + SHEETS[name].src);
    if (!tint) return img;
    const key = name + '|' + tint;
    if (!tinted[key] && img.complete && img.naturalWidth) {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      // 그림이 있는 자리에만 색을 덮는다. tint = 'rgba(...)' 처럼 투명도로 세기 조절
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = tint;
      x.fillRect(0, 0, c.width, c.height);
      tinted[key] = c;
    }
    return tinted[key] || img;
  }

  // 그 방향이 없을 때 쓸 가까운 방향 순서
  const NEAR = {
    south: ['south-east', 'south-west', 'east', 'west'],
    north: ['north-east', 'north-west', 'east', 'west'],
    east: ['south-east', 'north-east', 'south'],
    west: ['south-west', 'north-west', 'south'],
    'south-east': ['east', 'south'],
    'south-west': ['west', 'south'],
    'north-east': ['east', 'north'],
    'north-west': ['west', 'north'],
  };
  function findRow(anims, anim, dir) {
    for (const a of [anim, 'stand']) {
      const set = anims[a];
      if (!set) continue;
      if (set[dir]) return set[dir];
      for (const d of NEAR[dir] || []) if (set[d]) return set[d];
    }
    const any = Object.values(anims.stand || anims[Object.keys(anims)[0]]);
    return any[0];
  }

  S.has = (name, anim) => !!SHEETS[name].anims[anim];

  S.draw = function (ctx, name, o) {
    const sh = SHEETS[name];
    const cell = sh.cell;
    const [row, n] = findRow(sh.anims, o.anim || 'stand', o.dir || 'south');
    const fps = o.fps || 10;
    const f = Math.floor((o.t || 0) * fps) % n;
    const sc = o.scale || 1;
    const w = cell * sc;
    const img = sheetImg(name, o.tint);
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.drawImage(img, f * cell, row * cell, cell, cell, Math.round(o.x - w / 2), Math.round(o.y - w + (o.lift || 0)), w, w);
    if (o.flash) {
      // 맞았을 때 하얗게 번쩍
      ctx.globalAlpha = o.flash;
      ctx.drawImage(sheetImg(name, '#ffffff'), f * cell, row * cell, cell, cell, Math.round(o.x - w / 2), Math.round(o.y - w + (o.lift || 0)), w, w);
    }
    ctx.globalAlpha = 1;
  };

  // 발밑 그림자
  S.shadow = function (ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y - 1), r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  };
})();
