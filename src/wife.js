// 아내 손질. 받은 순서대로 하나씩, 시간이 든다 (→ docs/기획.md 5 손질해야 판다)
const Wife = {
  x: 0, y: 0,
  queue: [],          // 손질 기다리는 작물
  current: null,      // { crop, t } — t = 지금까지 손질한 게임 속 분
  ready: {},          // 손질된 것 → 개수 (저녁에 판다)
  speech: null, speechTimer: 0,

  // 장면에 들어설 때 그 장면의 자리로
  enter(scene) {
    const [tx, ty] = WIFE.at[scene];
    Object.assign(this, Player.spot(tx, ty));
    World.block(scene, tx, ty);
  },

  say(kind) {
    const lines = WIFE.lines[kind];
    this.speech = lines[Math.floor(Math.random() * lines.length)];
    this.speechTimer = 2.5;
  },

  // 가방을 통째로 받는다
  receive(bag) {
    const items = Object.entries(bag).flatMap(([crop, n]) => Array(n).fill(crop));
    if (!items.length) { this.say('empty'); return; }
    this.queue.push(...items);
    for (const k in bag) delete bag[k];
    this.say('receive');
  },

  // 말풍선은 실제 시간으로 사라진다
  update(dt) {
    if (this.speechTimer > 0 && (this.speechTimer -= dt) <= 0) this.speech = null;
  },

  // 손질은 게임 속 시간(분)으로 흐른다 — 낮엔 행동할 때만, 저녁엔 실시간 (→ docs/기획.md 4)
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
      if (!this.queue.length) this.say('done');
    }
  },

  progress() { return this.current ? this.current.t / (CROPS[this.current.crop].prep * CONFIG.prepMul) : 0; },
};
