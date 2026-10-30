// 조작: 키보드 + 마우스/손가락. 좌표는 모두 논리 화면(G.W×G.H) 기준.
//   I.down('KeyJ')  누르고 있는 중      I.hit('KeyJ')  이번에 막 누름
//   I.tap          이번에 누른 자리 {x, y} 또는 null (마우스 · 손가락 공통)
//   I.pointer      지금 가리키는 자리 {x, y}
//   I.useStick(true)        화면 왼쪽 절반을 끌면 가상 막대(I.stick = {x, y}, -1~1)
//   I.setButtons([{ id, label, x, y, r, keys:['KeyJ'] }])  화면 버튼. I.btn(id) 누르는 중, I.btnHit(id) 막 누름
(function () {
  const I = (G.input = {});
  const held = new Set();
  let pressed = new Set();
  I.tap = null;
  I.pointer = { x: -99, y: -99 };
  I.stick = { x: 0, y: 0 };
  I.touchUsed = false;
  let stickOn = false;
  let stickTouch = null; // { id, ox, oy }
  let buttons = [];
  const btnHeld = new Map(); // id → 누르는 손가락 수
  let btnPressed = new Set();

  I.down = (code) => held.has(code);
  I.hit = (code) => pressed.has(code);
  I.useStick = (on) => (stickOn = on);
  I.setButtons = (list) => (buttons = list);
  I.btn = (id) => (btnHeld.get(id) || 0) > 0 || (buttons.find((b) => b.id === id)?.keys || []).some(I.down);
  I.btnHit = (id) => btnPressed.has(id) || (buttons.find((b) => b.id === id)?.keys || []).some(I.hit);

  // 방향 입력(키보드 WASD · 화살표 + 가상 막대)
  I.move = function () {
    let x = 0,
      y = 0;
    if (I.down('KeyA') || I.down('ArrowLeft')) x -= 1;
    if (I.down('KeyD') || I.down('ArrowRight')) x += 1;
    if (I.down('KeyW') || I.down('ArrowUp')) y -= 1;
    if (I.down('KeyS') || I.down('ArrowDown')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    return { x: I.stick.x, y: I.stick.y };
  };

  I.endFrame = function () {
    pressed = new Set();
    btnPressed = new Set();
    I.tap = null;
  };

  I.attach = function (canvas) {
    addEventListener('keydown', (e) => {
      if (!held.has(e.code)) pressed.add(e.code);
      held.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => held.delete(e.code));
    addEventListener('blur', () => held.clear());

    function toLocal(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * G.W, y: ((e.clientY - r.top) / r.height) * G.H };
    }
    function buttonAt(p) {
      return buttons.find((b) => !b.hidden && G.dist(p.x, p.y, b.x, b.y) <= b.r + 6);
    }

    const owners = new Map(); // 손가락 id → 'stick' | 버튼 id | 'tap'
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const p = toLocal(e);
      I.pointer = p;
      if (e.pointerType === 'touch') I.touchUsed = true;
      const b = I.touchUsed ? buttonAt(p) : null;
      if (b) {
        owners.set(e.pointerId, b.id);
        btnHeld.set(b.id, (btnHeld.get(b.id) || 0) + 1);
        btnPressed.add(b.id);
      } else if (stickOn && I.touchUsed && p.x < G.W / 2 && !stickTouch) {
        owners.set(e.pointerId, 'stick');
        stickTouch = { id: e.pointerId, ox: p.x, oy: p.y };
      } else {
        owners.set(e.pointerId, 'tap');
        I.tap = p;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = toLocal(e);
      I.pointer = p;
      if (stickTouch && stickTouch.id === e.pointerId) {
        const R = 28;
        let dx = p.x - stickTouch.ox,
          dy = p.y - stickTouch.oy;
        const l = Math.hypot(dx, dy);
        if (l > R) {
          // 손가락을 멀리 끌면 중심도 따라온다
          stickTouch.ox = p.x - (dx / l) * R;
          stickTouch.oy = p.y - (dy / l) * R;
          dx = (dx / l) * R;
          dy = (dy / l) * R;
        }
        I.stick = l < 4 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
      }
    });
    function up(e) {
      const o = owners.get(e.pointerId);
      owners.delete(e.pointerId);
      if (o === 'stick') {
        stickTouch = null;
        I.stick = { x: 0, y: 0 };
      } else if (o && o !== 'tap') {
        btnHeld.set(o, Math.max(0, (btnHeld.get(o) || 0) - 1));
      }
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  // 손가락을 쓸 때만 막대 · 버튼을 그린다
  I.drawTouch = function (ctx) {
    if (!I.touchUsed) return;
    if (stickTouch) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(stickTouch.ox, stickTouch.oy, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(stickTouch.ox + I.stick.x * 28, stickTouch.oy + I.stick.y * 28, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of buttons) {
      if (b.hidden) continue;
      ctx.fillStyle = I.btn(b.id) ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      G.text(ctx, b.label, b.x, b.y, { align: 'center', base: 'middle', size: 9 });
    }
  };
})();
