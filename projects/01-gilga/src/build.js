// 짓고 고치기. 날짜가 아니라 들인 만큼 — 짓기 한 번마다 시간과 그만큼의 재료가 든다 (→ data/build.js)
const Build = {
  progress: {},   // 지을 것 → 짓기 몇 번 했나

  done(id) { return (this.progress[id] || 0) >= BUILDINGS[id].work; },
  // 터가 나타났나: after가 있으면 그걸 다 지은 뒤부터
  open(id) { const a = BUILDINGS[id].after; return !a || this.done(a); },
  // 아기 맞을 준비를 다 했나
  babyReady() { return Object.keys(BUILDINGS).filter(id => BUILDINGS[id].baby).every(id => this.done(id)); },
  ratio(id) { return Math.min(1, (this.progress[id] || 0) / BUILDINGS[id].work); },
  // 지은 것들의 효과를 합친 값 (예: energy)
  effect(key) {
    return Object.keys(BUILDINGS).filter(id => this.done(id)).reduce((a, id) => {
      const v = BUILDINGS[id].effect[key];
      if (v === undefined) return a;   // 이 건물엔 그 효과가 없음
      return typeof v === 'number' ? (a || 0) + v : a || v;
    }, 0);
  },

  // n번째 짓기에 드는 재료: 전체를 짓기 횟수로 고르게 나눈다
  // 다 짓기까지 남은 재료 (짓기마다 쓰는 양은 need)
  left(id) {
    const b = BUILDINGS[id], used = total => Math.ceil(total * (this.progress[id] || 0) / b.work);
    return { wood: b.wood - used(b.wood), stone: b.stone - used(b.stone) };
  },
  need(id) {
    const b = BUILDINGS[id], i = this.progress[id] || 0;
    const part = total => Math.ceil(total * (i + 1) / b.work) - Math.ceil(total * i / b.work);
    return { wood: part(b.wood), stone: part(b.stone) };
  },

  // 짓기 한 번. 돌려주는 것: { msg, ok, finished }
  work(id) {
    const b = BUILDINGS[id];
    if (this.done(id)) return { msg: b.name + ' 다 지었어요' };
    const need = this.need(id);
    if (Forest.wood < need.wood || Forest.stone < need.stone) {
      const lack = [need.wood > Forest.wood && `나무 ${need.wood - Forest.wood}`, need.stone > Forest.stone && `돌 ${need.stone - Forest.stone}`];
      return { msg: `${lack.filter(Boolean).join(' · ')}개가 더 있어야 해요 — 숲에서 구해 와요` };
    }
    Forest.wood -= need.wood;
    Forest.stone -= need.stone;
    this.progress[id] = (this.progress[id] || 0) + 1;
    const finished = this.done(id);
    return { ok: true, finished, msg: finished ? `${b.name} 완성! ${b.desc}` : `${b.name} 짓는 중 ${this.progress[id]}/${b.work}` };
  },
};
