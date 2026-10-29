// 밭 칸 상태. 작물 종류는 모르고 CROPS 데이터만 읽는다
const Farm = {
  plots: {},   // "x,y" → { crop, grown, wet }
  bag: {},     // 캔 작물 → 개수

  plot(tx, ty) {
    if (!World.tile(tx, ty)?.plot) return null;
    const k = tx + ',' + ty;
    return this.plots[k] || (this.plots[k] = { crop: null, grown: 0, wet: false });
  },
  isRipe(p) { return p.crop && p.grown >= CROPS[p.crop].days; },

  // 버튼 하나로 그 칸에 맞는 일: 빈 칸 → 심기, 자라는 중 → 물 주기, 다 자람 → 캐기
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
    if (!p.wet) {
      p.wet = true;
      return '물 줌';
    }
    return '오늘은 물을 이미 줬다';
  },

  // 물 준 칸만 하루치 자라고, 아침이면 다시 마른다
  newDay() {
    for (const p of Object.values(this.plots)) {
      if (p.crop && p.wet && !this.isRipe(p)) p.grown++;
      p.wet = false;
    }
  },
};
