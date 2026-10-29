// 저녁 장사. 손님이 자리에 앉아 메뉴 하나를 기다리고, 남편이 가져다준다 (→ docs/기획.md 4)
// 첫 버전 메뉴: 손질된 작물 하나 = 요리 하나
const Shop = {
  seats: [],
  customers: [],   // { seat, crop, patience, waited, color, eating }
  plan: [],        // 아직 안 들어온 손님이 원할 메뉴들
  timer: 0,
  served: 0, missed: 0, earned: 0,

  // tutorial이면 손님 수 · 메뉴를 그 시점 손질된 것에 맞춘다 — 실패할 수 없게 (→ docs/기획.md 5 튜토리얼)
  start(tutorial) {
    this.seats = World.find(t => t?.seat);
    this.customers = [];
    this.served = this.missed = this.earned = 0;
    this.timer = CUSTOMERS.every;   // 첫 손님은 바로
    const crops = Object.keys(CROPS);
    if (tutorial) {
      const stock = Object.entries(Wife.ready).flatMap(([c, n]) => Array(n).fill(c));
      this.plan = shuffle(stock).slice(0, CUSTOMERS.perEvening);
    } else {
      this.plan = Array.from({ length: CUSTOMERS.perEvening }, () => crops[Math.floor(Math.random() * crops.length)]);
    }
  },

  isOver() { return !this.plan.length && !this.customers.length; },
  at(tx, ty) { return this.customers.find(c => c.seat.tx === tx && c.seat.ty === ty) || null; },

  update(dt) {
    // 빈 자리가 있으면 일정 간격으로 한 명씩
    this.timer += dt;
    const free = this.seats.filter(s => !this.at(s.tx, s.ty));
    if (this.plan.length && free.length && this.timer >= CUSTOMERS.every) {
      this.timer = 0;
      const seat = free[Math.floor(Math.random() * free.length)];
      const [lo, hi] = CUSTOMERS.patience;
      this.customers.push({
        seat, crop: this.plan.shift(), waited: 0, eating: 0,
        patience: lo + Math.random() * (hi - lo),
        color: CUSTOMERS.colors[Math.floor(Math.random() * CUSTOMERS.colors.length)],
      });
      World.block('shop', seat.tx, seat.ty);
    }
    for (const c of [...this.customers]) {
      if (c.eating) {
        if ((c.eating -= dt) <= 0) this.leave(c);
      } else if ((c.waited += dt) >= c.patience) {
        this.missed++;
        this.leave(c);
      }
    }
  },

  leave(c) {
    this.customers.splice(this.customers.indexOf(c), 1);
    World.unblock('shop', c.seat.tx, c.seat.ty);
  },

  // 남편이 손님 옆에 닿았을 때. 메뉴가 떨어졌으면 아쉽게 돌아간다
  serve(c) {
    if (!this.customers.includes(c) || c.eating) return null;
    const name = CROPS[c.crop].name;
    if (!Wife.ready[c.crop]) {
      this.missed++;
      this.leave(c);
      return name + ' 요리가 떨어졌어요';
    }
    Wife.ready[c.crop]--;
    this.served++;
    this.earned += CROPS[c.crop].dish;
    state.money += CROPS[c.crop].dish;
    c.eating = CUSTOMERS.eat;
    return `${name} 요리 냄 +${CROPS[c.crop].dish}`;
  },
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
