// 화면 버튼 · 판(2D, 겹친 화면). 그릴 때 자리를 기억해 두고, 반복(update)에서 눌렸는지 본다.
//   draw:   G.ui.begin() → G.ui.button(ctx, 'id', x, y, w, h, '글자', { on, off, color }) · G.ui.panel(ctx, x, y, w, h)
//   update: if (G.ui.hit('id')) ...      G.ui.over(I.tap) → 버튼 위를 눌렀나(세상 클릭과 구분)
(function () {
  const U = (G.ui = {});
  let rects = {};
  let next = {};

  U.begin = function () {
    rects = next;
    next = {};
  };
  U.panel = function (ctx, x, y, w, h, alpha = 0.78) {
    ctx.fillStyle = `rgba(26,20,32,${alpha})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    next['panel:' + x + ',' + y] = { x, y, w, h, panel: true };
  };
  U.button = function (ctx, id, x, y, w, h, label, o = {}) {
    next[id] = { x, y, w, h, off: o.off };
    const hover = !G.input.touchUsed && inside(G.input.pointer, next[id]);
    ctx.fillStyle = o.off ? '#2a2434' : o.on ? o.color || '#6a4e9a' : hover ? '#4e3e6a' : '#3a2e50';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = o.on ? '#ffe9a8' : o.off ? '#3a3448' : 'rgba(255,255,255,0.25)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    G.text(ctx, label, x + w / 2, y + h / 2 + 0.5, { align: 'center', base: 'middle', size: o.size || 9, color: o.off ? '#777' : '#fff' });
  };
  function inside(p, r) {
    return p && r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  U.hit = (id) => {
    const r = rects[id];
    return !!(r && !r.off && inside(G.input.tap, r));
  };
  U.over = (p) => Object.values(rects).some((r) => inside(p, r));
})();
