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

  tileColor(t) {
    if (t.gate && World.opened.has(t.gate)) return t.openColor;
    if (t.build && Build.done(t.build)) return BUILDINGS[t.build].color;
    return t.color;
  },

  // 숲에서 딸 것: 나무 = 줄기 + 잎, 바위 = 회색 덩이, 덤불 = 연두 + 열매(오늘 땄으면 열매 없음)
  gatherIcon(kind, x, y, picked) {
    if (kind === 'wood') { this.rect(x + 6, y + 9, 4, 7, '#6b4a2a'); this.rect(x + 1, y, 14, 11, '#2a5a26'); this.rect(x + 3, y + 1, 6, 3, '#3a7434'); }
    if (kind === 'stone') { this.rect(x + 2, y + 5, 12, 10, '#8c8c88'); this.rect(x + 4, y + 6, 6, 3, '#b0b0aa'); }
    if (kind === 'bush') {
      this.rect(x + 2, y + 5, 12, 10, '#6fbf4a');
      if (!picked) for (const [dx, dy] of [[4, 7], [9, 9], [6, 12]]) this.rect(x + dx, y + dy, 2, 2, '#e05a5a');
    }
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
      for (let tx = 0; tx < World.w; tx++) {
        const t = World.tile(tx, ty);
        this.rect(tx * T, ty * T, T, T, this.tileColor(t));
        if (t.gather) this.gatherIcon(t.gather, tx * T, ty * T, Forest.isPicked(tx, ty));
      }
    this.sites();

    // 할 일 칸 · 긋는 중인 칸 표시
    for (const j of Player.jobs) if (j.act) this.outline(j.tx * T, j.ty * T, T, T, '#fff8');
    if (Touch.fromPlot) for (const t of Touch.tiles) this.outline(t.tx * T, t.ty * T, T, T, '#ffd76a');

    // 바닥(기준점) y가 작은 것부터 (→ docs/아트_규격.md 2 그리는 순서)
    const list = [];
    for (const [k, p] of Object.entries(Farm.plots)) {
      if (!p.crop) continue;
      const [tx, ty] = k.split(',').map(Number);
      list.push({ y: ty * T + T - 1, draw: () => this.crop(tx * T, ty * T, p) });
    }
    list.push({ y: Player.y, draw: () => this.player() });
    list.push({ y: Wife.y, draw: () => this.wife() });
    for (const g of Guests.list) list.push({ y: g.y, draw: () => this.guest(g) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());

    // 작업대 위: 다 된 요리 접시 · 새참
    const [wx, wy] = WIFE.at, bx = (wx - 1) * T, by = wy * T;
    for (let i = 0; i < Math.min(6, Wife.readyCount()); i++) this.rect(bx + 2 + (i % 3) * 4, by + 3 + Math.floor(i / 3) * 5, 3, 3, '#fff8ec');
    if (!state.snack && hourNow() >= DAY.snack.from) this.rect(bx + 4, by + 11, 8, 4, '#e8e0c8');
    // 머리 위: 손질 진행 막대, 말풍선
    if (Wife.current) {
      this.rect(Wife.x - 8, Wife.y - 37, 16, 4, '#2b231d');
      this.rect(Wife.x - 7, Wife.y - 36, 14 * Wife.progress(), 2, CROPS[Wife.current.crop].color);
    }
    if (Wife.speech) this.bubble(Wife.x, Wife.y - 40, Wife.speech);
  },

  // 말풍선. 글자는 기기 픽셀 크기로 그려서 또렷하게
  bubble(x, y, text) {
    const ctx = this.ctx, px = Math.round(14 * this.dpr);
    ctx.font = `${px}px sans-serif`;
    const w = ctx.measureText(text).width + px, h = px * 1.8;
    const X = Math.round(x * this.scale) - this.camX - w / 2, Y = Math.round(y * this.scale) - this.camY - h;
    ctx.fillStyle = '#fff8ec';
    ctx.fillRect(X, Y, w, h);
    ctx.fillStyle = '#2b231d';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, X + px / 2, Y + h / 2);
  },

  // 임시 작물: 작물 색으로 구분. 자랄수록 높아지고, 다 자라면 큰 네모
  crop(x, y, p) {
    const c = CROPS[p.crop];
    if (Farm.isRipe(p)) {
      this.rect(x + 3, y + 3, 10, 11, c.color);
      this.rect(x + 3, y + 13, 10, 1, '#0004');
      return;
    }
    const h = 3 + Math.round(7 * p.grown / c.days);
    this.rect(x + 6, y + 14 - h, 4, h, c.color);
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

  // 임시 지나가는 사람. 먹는 중이면 머리 위에 접시
  guest(g) {
    const x = g.x - 8, y = g.y - 32;
    this.rect(g.x - 5, g.y - 2, 10, 3, '#0003');
    this.rect(x + 3, y + 14, 10, 17, g.color);
    this.rect(x + 4, y + 4, 8, 10, '#e8c19a');
    if (g.eat > 0) this.rect(g.x - 4, y - 2, 8, 3, '#fff8ec');
  },

  // 지을 터: 다 짓기 전엔 진행 막대
  sites() {
    const T = CONFIG.tile;
    for (const id of Object.keys(BUILDINGS)) {
      if (Build.done(id)) continue;
      const tiles = World.find(t => t?.build === id);
      if (!tiles.length) continue;
      const x0 = Math.min(...tiles.map(t => t.tx)) * T, x1 = (Math.max(...tiles.map(t => t.tx)) + 1) * T;
      const y0 = Math.min(...tiles.map(t => t.ty)) * T;
      this.outline(x0, y0, x1 - x0, (Math.max(...tiles.map(t => t.ty)) + 1) * T - y0, '#6b4a33');
      this.rect(x0 + 2, y0 + 3, x1 - x0 - 4, 3, '#2b231d');
      this.rect(x0 + 3, y0 + 4, (x1 - x0 - 6) * Build.ratio(id), 1, '#ffd76a');
    }
  },

  // 임시 아내: 치마 + 불러 오는 배, 작업대(왼쪽)를 본다. 장사하지 않을 땐 아기 옷을 뜬다(털실)
  wife() {
    const x = Wife.x - 8, y = Wife.y - 32;
    this.rect(Wife.x - 5, Wife.y - 2, 10, 3, '#0003');
    this.rect(x + 3, y + 14, 10, 17, '#b5536a');             // 몸
    this.rect(x + 2, y + 19, 3, 6, '#b5536a');               // 배
    this.rect(x + 4, y + 4, 8, 10, '#f0c9a0');               // 머리
    this.rect(x + 3, y + 3, 10, 4, '#5a3a22');               // 머리카락
    this.rect(x + 4, y + 8, 2, 2, '#2a1e16');                // 눈
    if (!Wife.current && !Wife.queue.length && (!Wife.readyCount() || Wife.tired()))
      this.rect(x + 1, y + 22, 4, 4, '#f2a8c0');             // 털실
  },
};
