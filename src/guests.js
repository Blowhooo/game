// 지나가는 사람. 길을 늘 지나다니고, 아내에게 요리가 있고 기력이 남았을 때만 자리에 들러 먹고 간다 (→ docs/기획.md 5)
// 요리가 없으면 그냥 지나간다 — 알림 · 벌 없이 보이는 것만으로. 실제 시간으로 움직인다
const Guests = {
  list: [],        // { x, y, dir, color, way: [{x, y}], seat, crop, eat, done }
  seats: [],
  roadY: 0,
  timer: 0,
  served: 0, earned: 0,   // 오늘

  init() {
    const T = CONFIG.tile;
    this.seats = World.find(t => t?.seat);
    const road = MAP.findIndex(r => TILES[r[0]]?.name === '길');
    this.roadY = road * T + T - 4;
  },

  seatTaken(s) { return this.list.some(g => g.seat === s); },

  update(dt) {
    const T = CONFIG.tile, W = World.w * T;
    if ((this.timer += dt) >= GUESTS.every) {
      this.timer = 0;
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.list.push({ x: dir > 0 ? -8 : W + 8, y: this.roadY, dir, way: [],
        color: GUESTS.colors[Math.floor(Math.random() * GUESTS.colors.length)] });
    }
    for (const g of [...this.list]) {
      if (g.eat > 0) {
        if ((g.eat -= dt) <= 0) this.pay(g);
        continue;
      }
      let step = GUESTS.speed * dt;
      // 갈 곳이 있으면 그리로, 없으면 길 따라
      while (g.way.length && step > 0) {
        const p = g.way[0], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
        if (d <= step) { g.x = p.x; g.y = p.y; g.way.shift(); step -= d; }
        else { g.x += dx / d * step; g.y += dy / d * step; step = 0; }
        if (!g.way.length && g.seat && !g.done) g.eat = GUESTS.eat;
      }
      if (g.way.length || g.eat > 0) continue;
      const before = g.x;
      g.x += g.dir * step;
      if (!g.done && !g.seat) this.maybeVisit(g, before);
      if (g.x < -16 || g.x > W + 16) this.list.splice(this.list.indexOf(g), 1);
    }
  },

  // 빈 자리 앞을 지날 때 요리가 있으면 들른다
  maybeVisit(g, before) {
    const T = CONFIG.tile;
    const seat = this.seats.find(s => {
      const sx = s.tx * T + T / 2;
      return (before - sx) * (g.x - sx) <= 0 && !this.seatTaken(s);
    });
    if (!seat || !Wife.canSell()) return;
    g.crop = Wife.reserve();
    g.seat = seat;
    const p = Player.spot(seat.tx, seat.ty);
    g.way = [{ x: p.x, y: this.roadY }, p];
    World.block(seat.tx, seat.ty);
  },

  // 다 먹고 값을 내고 길로 돌아간다
  pay(g) {
    const price = Cooking.price(g.crop);
    state.money += price;
    this.earned += price;
    this.served++;
    const opened = Cooking.serve(g.crop);
    if (opened) { Wife.sayText(opened.line); Hud.say(`새 메뉴: ${opened.name} (${CROPS[opened.crop].name} 요리 값 ${opened.dish})`); }
    g.done = true;
    World.unblock(g.seat.tx, g.seat.ty);
    g.way = [{ x: g.x, y: this.roadY }];
  },

  // 하루 끝: 길에 있던 사람들은 다 지나간 것으로
  endDay() {
    for (const g of this.list) if (g.seat && !g.done) World.unblock(g.seat.tx, g.seat.ty);
    this.list = [];
    this.served = this.earned = 0;
  },
};
