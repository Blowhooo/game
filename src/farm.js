// 밭 칸 상태. 작물 종류는 모르고 CROPS 데이터만 읽는다
const Farm = {
  plots: {},   // "x,y" → { crop, grown }
  bag: {},     // 캔 작물 → 개수

  // 시작 밭을 데이터대로 채운다
  init(field) {
    for (const { crop, ripe, at } of field)
      for (const [tx, ty] of at) {
        const p = this.plot(tx, ty);
        p.crop = crop;
        p.grown = CROPS[crop].days - (ripe ? 0 : 1);
      }
  },

  plot(tx, ty) {
    if (!World.tile(tx, ty)?.plot) return null;
    const k = tx + ',' + ty;
    return this.plots[k] || (this.plots[k] = { crop: null, grown: 0 });
  },
  isRipe(p) { return p.crop && p.grown >= CROPS[p.crop].days; },

  // 버튼 하나로 그 칸에 맞는 일: 빈 칸 → 심기, 다 자람 → 캐기
  act(tx, ty, seed) {
    const p = this.plot(tx, ty);
    if (!p) return null;
    if (!p.crop) {
      p.crop = seed; p.grown = 0;
      return CROPS[seed].name + ' 심음';
    }
    if (this.isRipe(p)) {
      const name = CROPS[p.crop].name;
      this.bag[p.crop] = (this.bag[p.crop] || 0) + 1;
      p.crop = null; p.grown = 0;
      return name + ' 캠';
    }
    return CROPS[p.crop].name + ' 자라는 중 (' + (CROPS[p.crop].days - p.grown) + '일 남음)';
  },

  // 물 주기 없이 하루에 한 단계씩 저절로 자란다 (→ docs/기획.md 5)
  newDay() {
    for (const p of Object.values(this.plots))
      if (p.crop && !this.isRipe(p)) p.grown++;
  },
};
