// 그리기는 전부 여기. 나중에 PixiJS로 바꾸면 이 파일만 갈아 끼운다 (→ docs/기술.md 1)
const Render = {
  canvas: null, ctx: null, scale: 1,
  viewW: 0, viewH: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.viewW = World.w * CONFIG.tile;
    this.viewH = World.h * CONFIG.tile;
    this.resize();
    addEventListener('resize', () => this.resize());
  },

  // 창에 맞는 가장 큰 정수 배율 (→ docs/아트_규격.md 2 화면 배율)
  resize() {
    const room = innerHeight - 90;
    this.scale = Math.max(1, Math.floor(Math.min(innerWidth / this.viewW, room / this.viewH)));
    this.canvas.width = this.viewW * this.scale;
    this.canvas.height = this.viewH * this.scale;
    this.ctx.imageSmoothingEnabled = false;
  },

  // 게임 좌표로 받아 화면 픽셀 단위로 반올림 (→ docs/기술.md 1 이동)
  rect(x, y, w, h, color) {
    const s = this.scale;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s));
  },
  outline(x, y, w, h, color) {
    const s = this.scale;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = s;
    this.ctx.strokeRect(x * s + s / 2, y * s + s / 2, w * s - s, h * s - s);
  },

  frame() {
    const T = CONFIG.tile;
    for (let ty = 0; ty < World.h; ty++)
      for (let tx = 0; tx < World.w; tx++) {
        const t = World.tile(tx, ty), p = Farm.plots[tx + ',' + ty];
        this.rect(tx * T, ty * T, T, T, p?.wet ? t.wetColor : t.color);
      }

    const tg = Player.target();
    if (World.tile(tg.tx, tg.ty)?.plot) this.outline(tg.tx * T, tg.ty * T, T, T, '#fff8');

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
      this.outline(x + 3, y + 3, 10, 11, '#0005');
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
