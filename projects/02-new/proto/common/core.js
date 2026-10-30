// 공용 뼈대: 화면(논리 해상도 W×H, 정수 배율로 키움) · 반복(고정 간격) · 그림 불러오기 · 작은 도우미.
// 시제품마다 G.start({ w, h, update(dt), draw(ctx) }) 하나만 부르면 된다.
window.G = window.G || {};

(function () {
  const images = {};

  // 그림 불러오기: G.img('assets/x.png') 는 바로 Image를 돌려주고, 다 불러지면 그린다.
  G.img = function (src) {
    if (!images[src]) {
      const im = new Image();
      im.src = src;
      images[src] = im;
    }
    return images[src];
  };
  G.imagesReady = function () {
    return Object.values(images).every((im) => im.complete && im.naturalWidth > 0);
  };

  G.start = function (game) {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    G.W = game.w;
    G.H = game.h;
    G.canvas = canvas;
    G.ctx = ctx;

    function resize() {
      // 배율은 2 이상이면 정수로(픽셀이 고르게), 작은 화면에선 꽉 차게
      const raw = Math.min(innerWidth / G.W, innerHeight / G.H);
      const s = raw >= 2 ? Math.floor(raw) : raw;
      // 실제 화면 픽셀로 그리고 배율을 걸면 글자는 또렷, 그림은 픽셀 그대로
      G.scale = s * (devicePixelRatio || 1);
      canvas.width = Math.round(G.W * G.scale);
      canvas.height = Math.round(G.H * G.scale);
      canvas.style.width = G.W * s + 'px';
      canvas.style.height = G.H * s + 'px';
      ctx.imageSmoothingEnabled = false;
    }
    addEventListener('resize', resize);
    resize();
    if (G.input) G.input.attach(canvas);

    const STEP = 1 / 60;
    let last = performance.now();
    let acc = 0;
    G.time = 0;
    function frame(now) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (G.imagesReady()) {
        while (acc >= STEP) {
          G.time += STEP;
          game.update(STEP);
          if (G.input) G.input.endFrame();
          acc -= STEP;
        }
        ctx.save();
        ctx.setTransform(G.scale, 0, 0, G.scale, 0, 0);
        ctx.imageSmoothingEnabled = false;
        game.draw(ctx);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  // 도우미
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 방향: 벡터 → 8방향 이름(PixelLab 이름과 같음)
  const DIR8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  G.dirOf = function (dx, dy) {
    const a = Math.atan2(dy, dx);
    return DIR8[(Math.round(a / (Math.PI / 4)) + 8) % 8];
  };
  G.dirVec = function (dir) {
    const i = DIR8.indexOf(dir);
    const a = (i * Math.PI) / 4;
    return [Math.cos(a), Math.sin(a)];
  };

  // 저장(시제품마다 이름을 달리해서)
  G.save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
  G.load = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (e) {
      return fallback;
    }
  };

  // 글자: 픽셀 화면에 또렷하게(테두리 있는 글자)
  G.text = function (ctx, str, x, y, opt = {}) {
    ctx.font = `${opt.bold ? 'bold ' : ''}${opt.size || 10}px "Galmuri11", "Malgun Gothic", sans-serif`;
    ctx.textAlign = opt.align || 'left';
    ctx.textBaseline = opt.base || 'top';
    ctx.globalAlpha = opt.alpha ?? 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = opt.stroke || '#1a1420';
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = opt.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.globalAlpha = 1;
  };
})();
