// 그리기는 전부 여기. 나중에 PixiJS로 바꾸면 이 파일만 갈아 끼운다 (→ docs/기술.md 1)
const Render = {
  canvas: null, ctx: null,
  dpr: 1, scale: 1,           // scale = 게임 픽셀 하나가 화면(기기) 픽셀 몇 개인지
  viewW: 0, viewH: 0,         // 화면에 보이는 넓이(게임 픽셀)
  camX: 0, camY: 0,           // 화면 왼쪽 위(기기 픽셀)

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    addEventListener('resize', () => this.resize());
  },

  // 정수 배율: 맵이 다 들어가는 배율과 손가락 크기 배율 중 큰 쪽 (→ docs/아트_규격.md 2 화면 배율)
  resize() {
    const T = CONFIG.tile;
    this.dpr = devicePixelRatio || 1;
    const W = Math.round(innerWidth * this.dpr), H = Math.round(innerHeight * this.dpr);
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.style.width = innerWidth + 'px';
    this.canvas.style.height = innerHeight + 'px';
    const fit = Math.floor(Math.min(W / (World.w * T), H / (World.h * T)));
    const finger = Math.ceil(CONFIG.minTilePx * this.dpr / T);
    this.scale = Math.max(1, fit, finger);
    this.viewW = W / this.scale;
    this.viewH = H / this.scale;
    this.ctx.imageSmoothingEnabled = false;
  },

  // 화면이 남편을 따라가되 맵 밖은 안 보이게. 맵이 더 작으면 가운데
  follow() {
    const T = CONFIG.tile;
    const axis = (p, view, size) => size <= view ? -(view - size) / 2
      : Math.min(Math.max(p - view / 2, 0), size - view);
    this.camX = Math.round(axis(Player.x, this.viewW, World.w * T) * this.scale);
    this.camY = Math.round(axis(Player.y, this.viewH, World.h * T) * this.scale);
  },

  // 화면 좌표(CSS 픽셀) → 칸
  toTile(clientX, clientY) {
    const T = CONFIG.tile;
    return {
      tx: Math.floor((clientX * this.dpr + this.camX) / this.scale / T),
      ty: Math.floor((clientY * this.dpr + this.camY) / this.scale / T),
    };
  },

  // 게임 좌표로 받아 화면 픽셀 단위로 반올림 (→ docs/기술.md 1 이동)
  rect(x, y, w, h, color) {
    const s = this.scale;
    const X = Math.round(x * s) - this.camX, Y = Math.round(y * s) - this.camY;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(X, Y, Math.round((x + w) * s) - this.camX - X, Math.round((y + h) * s) - this.camY - Y);
  },
  outline(x, y, w, h, color) {
    const s = this.scale, lw = Math.max(2, Math.round(s / 2));
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lw;
    this.ctx.strokeRect(x * s - this.camX + lw / 2, y * s - this.camY + lw / 2, w * s - lw, h * s - lw);
  },

  frame() {
    const T = CONFIG.tile;
    this.follow();
    this.ctx.fillStyle = '#1e1a17';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let ty = 0; ty < World.h; ty++)
      for (let tx = 0; tx < World.w; tx++)
        this.rect(tx * T, ty * T, T, T, World.tile(tx, ty).color);

    // 할 일 칸 표시, 씨앗을 골랐으면 줄마다 노란 테두리(누를 곳)
    for (const j of Player.jobs) if (j.act) this.outline(j.tx * T, j.ty * T, T, T, '#fff8');
    for (const r of Farm.rows) {
      const a = r.tiles[0], n = r.tiles.length;
      if (state.seed) this.outline(a.tx * T, a.ty * T, n * T, T, '#ffd76a');
      // 예약 표시: 줄 왼쪽에 다음 작물 색
      if (r.next) { this.rect(a.tx * T - 6, a.ty * T + 5, 5, 6, '#2b231d'); this.rect(a.tx * T - 5, a.ty * T + 6, 3, 4, CROPS[r.next].color); }
    }

    // 바닥(기준점) y가 작은 것부터 (→ docs/아트_규격.md 2 그리는 순서)
    const list = [];
    for (const [k, p] of Object.entries(Farm.plots)) {
      if (!p.crop) continue;
      const [tx, ty] = k.split(',').map(Number);
      list.push({ y: ty * T + T - 1, draw: () => this.crop(tx * T, ty * T, p) });
    }
    list.push({ y: Player.y, draw: () => this.player() });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
  },

  // 임시 작물: 자랄수록 높아지고, 다 자라면 작물 색
  crop(x, y, p) {
    const c = CROPS[p.crop];
    if (Farm.isRipe(p)) {
      this.rect(x + 3, y + 3, 10, 11, c.color);
      this.rect(x + 3, y + 13, 10, 1, '#0004');
      return;
    }
    const h = 3 + Math.round(7 * p.grown / c.days);
    this.rect(x + 6, y + 14 - h, 4, h, '#3f8f3a');
  },

  // 임시 남편: 16×32 칸 안의 네모 + 바라보는 쪽 표시
  player() {
    const x = Player.x - 8, y = Player.y - 32;
    this.rect(Player.x - 5, Player.y - 2, 10, 3, '#0003');   // 그림자 (같은 발 위치)
    this.rect(x + 3, y + 14, 10, 17, '#4a6fa5');             // 몸
    this.rect(x + 4, y + 4, 8, 10, '#f0c9a0');               // 머리
    const d = DIRS[Player.dir];
    if (Player.dir !== 'up') this.rect(x + 7 + d.dx * 3, y + 8, 2, 2, '#2a1e16');  // 눈
  },
};
