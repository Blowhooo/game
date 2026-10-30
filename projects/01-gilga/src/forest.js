// 숲. 나무 · 바위 = 짓기 재료(가방 안 씀, 바로 쌓임), 덤불 = 먹을 재료(가방에 담김, 하루 한 번) (→ data/forest.js)
const Forest = {
  wood: 0, stone: 0,
  picked: new Set(),   // 오늘 딴 덤불 "x,y"

  isPicked(tx, ty) { return this.picked.has(tx + ',' + ty); },

  // 칸 하나 일. 돌려주는 것: { msg, cost } — cost = 든 행동(data/day.js cost의 이름), 못 했으면 없음
  gather(tx, ty) {
    const kind = World.tile(tx, ty)?.gather;
    if (kind === 'wood') { this.wood++; return { msg: '나무 +1', cost: 'wood' }; }
    if (kind === 'stone') { this.stone++; return { msg: '돌 +1', cost: 'stone' }; }
    if (kind !== 'bush') return { msg: null };
    if (this.isPicked(tx, ty)) return { msg: '오늘은 다 땄어요' };
    if (Farm.bagFull()) return { msg: '가방이 가득 찼어요' };
    const { gives, min, max } = FOREST.bush;
    const crop = gives[Math.floor(Math.random() * gives.length)];
    const n = Math.min(min + Math.floor(Math.random() * (max - min + 1)), CONFIG.bagSize - Farm.bagCount());
    Farm.bag[crop] = (Farm.bag[crop] || 0) + n;
    this.picked.add(tx + ',' + ty);
    return { msg: `${CROPS[crop].name} +${n}`, cost: 'forage' };
  },

  newDay() { this.picked.clear(); },
};
