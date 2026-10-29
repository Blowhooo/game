// 맵 글자 → 칸 조회
const World = {
  w: MAP[0].length,
  h: MAP.length,
  start: null,
  init() {
    MAP.forEach((row, y) => {
      const x = row.indexOf('P');
      if (x >= 0) this.start = { x, y };
    });
  },
  char(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    const c = MAP[ty][tx];
    return c === 'P' ? '.' : c;
  },
  tile(tx, ty) { return TILES[this.char(tx, ty)] || null; },
  // 맵 밖도 막힌 칸으로 본다
  isSolid(tx, ty) {
    const t = this.tile(tx, ty);
    return !t || t.solid;
  },
};
