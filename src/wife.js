// 아내. 받은 재료에서 부부가 먹을 몫을 먼저 떼고, 나머지를 받은 순서대로 손질 · 요리한다 (→ docs/기획.md 5)
// 요리가 있고 기력이 남았으면 지나가는 사람이 들른다(src/guests.js). 기력 = 하루에 팔 수 있는 요리 수
const Wife = {
  x: 0, y: 0,
  queue: [],          // 손질 기다리는 재료
  current: null,      // { crop, t } — t = 지금까지 손질한 게임 속 분
  ready: {},          // 다 된 요리(재료 이름) → 개수
  sold: 0,            // 오늘 판 수
  speech: null, speechTimer: 0,

  init() {
    const [tx, ty] = WIFE.at;
    Object.assign(this, Player.spot(tx, ty));
    World.block(tx, ty);
  },

  say(kind) {
    const lines = WIFE.lines[kind];
    this.speech = lines[Math.floor(Math.random() * lines.length)];
    this.speechTimer = 2.5;
  },
  sayText(text) { this.speech = text; this.speechTimer = 3; },

  energy() { return WIFE.energy + Build.effect('energy') + (state.restLeft > 0 ? DAY.rest.energy : 0); },
  tired() { return this.sold >= this.energy(); },
  readyCount() { return Object.values(this.ready).reduce((a, n) => a + n, 0); },
  canSell() { return !this.tired() && this.readyCount() > 0; },
  // 들르기로 한 손님 몫을 미리 떼어 둔다. 가장 많이 남은 요리부터
  reserve() {
    if (!this.canSell()) return null;
    const crop = Object.keys(this.ready).filter(c => this.ready[c]).sort((a, b) => this.ready[b] - this.ready[a])[0];
    this.ready[crop]--;
    this.sold++;
    if (this.tired()) this.say('tired');
    return crop;
  },

  // 가방을 통째로 받는다. 먹을 몫은 싼 것부터 먼저 뗀다
  receive(bag) {
    const items = Object.entries(bag).flatMap(([crop, n]) => Array(n).fill(crop));
    for (const k in bag) delete bag[k];
    if (!items.length) return false;
    items.sort((a, b) => Cooking.price(a) - Cooking.price(b));
    let fed = 0;
    while (state.fed < DAY.food && items.length) { items.shift(); state.fed++; fed++; }
    this.queue.push(...items);
    this.say(fed && !items.length ? 'food' : 'receive');
    return true;
  },

  // 말풍선은 실제 시간으로 사라진다
  update(dt) {
    if (this.speechTimer > 0 && (this.speechTimer -= dt) <= 0) this.speech = null;
  },

  // 손질은 게임 속 시간(분)으로 흐른다 — 남편이 행동할 때만 (→ docs/기획.md 4)
  work(min) {
    while (min > 0) {
      if (!this.current && this.queue.length) this.current = { crop: this.queue.shift(), t: 0 };
      if (!this.current) return;
      const need = CROPS[this.current.crop].prep * CONFIG.prepMul - this.current.t;
      if (min < need) { this.current.t += min; return; }
      min -= need;
      const crop = this.current.crop;
      this.ready[crop] = (this.ready[crop] || 0) + 1;
      this.current = null;
    }
  },

  // 하루 끝: 창고가 없으면 남은 재료 · 요리는 다음 날로 남지 않는다. 남은 개수를 돌려준다
  endDay() {
    const left = this.queue.length + (this.current ? 1 : 0) + this.readyCount();
    if (!Build.effect('keep')) { this.queue = []; this.current = null; this.ready = {}; }
    this.sold = 0;
    return left;
  },

  progress() { return this.current ? this.current.t / (CROPS[this.current.crop].prep * CONFIG.prepMul) : 0; },
};

// 아내의 요리: 손님에게 낸 요리 수만큼 새 메뉴가 열린다 (→ data/wife.js cooking)
const Cooking = {
  served: 0,   // 지금까지 손님에게 낸 요리 수

  menu(crop) { return [...WIFE.cooking].reverse().find(m => m.crop === crop && this.served >= m.at) || null; },
  price(crop) { return this.menu(crop)?.dish ?? CROPS[crop].dish; },
  dishName(crop) { return this.menu(crop)?.name ?? CROPS[crop].name + ' 요리'; },
  next() { return WIFE.cooking.find(m => this.served < m.at) || null; },

  // 손님이 먹고 값을 냈을 때. 새 메뉴가 열리면 그 메뉴를 돌려준다
  serve(crop) {
    const before = this.next();
    this.served++;
    return before && this.served >= before.at ? before : null;
  },
};
