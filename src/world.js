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

  // 칸 단위 길 찾기(8방향, 막힌 칸 모서리는 못 비집음). 시작 칸은 빼고 돌려준다. 못 가면 null
  findPath(from, to) {
    if (this.isSolid(to.tx, to.ty)) return null;
    const key = (x, y) => x + ',' + y;
    const prev = { [key(from.tx, from.ty)]: null };
    const queue = [from];
    while (queue.length) {
      const c = queue.shift();
      if (c.tx === to.tx && c.ty === to.ty) {
        const path = [];
        for (let k = key(c.tx, c.ty), n = c; n; n = prev[k], k = n && key(n.tx, n.ty)) path.unshift(n);
        return path.slice(1);
      }
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = c.tx + dx, ny = c.ty + dy;
          if ((!dx && !dy) || this.isSolid(nx, ny) || key(nx, ny) in prev) continue;
          if (dx && dy && (this.isSolid(c.tx + dx, c.ty) || this.isSolid(c.tx, c.ty + dy))) continue;
          prev[key(nx, ny)] = c;
          queue.push({ tx: nx, ty: ny });
        }
    }
    return null;
  },
};
