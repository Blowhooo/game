// 지금 장면의 맵 글자 → 칸 조회
const World = {
  scene: null, map: null,
  w: 0, h: 0,
  start: null,
  blockers: {},   // 장면마다 맵 글자 말고도 막힌 칸(사람이 서 있는 자리 등): scene → Set("x,y")
  opened: new Set(),   // 소식을 들어 열린 문(gate 이름)

  load(scene) {
    this.scene = scene;
    this.map = SCENES[scene];
    this.w = this.map[0].length;
    this.h = this.map.length;
    this.map.forEach((row, y) => {
      const x = row.indexOf('P');
      if (x >= 0) this.start = { x, y };
    });
  },
  block(scene, tx, ty) { (this.blockers[scene] ||= new Set()).add(tx + ',' + ty); },
  unblock(scene, tx, ty) { this.blockers[scene]?.delete(tx + ',' + ty); },

  char(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    const c = this.map[ty][tx];
    // P는 그 장면의 바닥
    return c === 'P' ? (this.scene === 'shop' ? '_' : '.') : c;
  },
  tile(tx, ty) { return TILES[this.char(tx, ty)] || null; },
  // 맵 밖도 막힌 칸으로 본다
  isSolid(tx, ty) {
    const t = this.tile(tx, ty);
    if (t?.gate && this.opened.has(t.gate)) return false;
    return !t || t.solid || !!this.blockers[this.scene]?.has(tx + ',' + ty);
  },
  // 이 장면에서 조건에 맞는 칸들
  find(test) {
    const out = [];
    for (let ty = 0; ty < this.h; ty++)
      for (let tx = 0; tx < this.w; tx++)
        if (test(this.tile(tx, ty))) out.push({ tx, ty });
    return out;
  },

  // 칸 단위 길 찾기(8방향, 대각선은 √2칸, 막힌 칸 모서리는 못 비집음). 시작 칸은 빼고 돌려준다. 못 가면 null
  findPath(from, to) {
    if (this.isSolid(to.tx, to.ty)) return null;
    const key = (x, y) => x + ',' + y;
    const cost = { [key(from.tx, from.ty)]: 0 };
    const prev = { [key(from.tx, from.ty)]: null };
    const open = [from];
    while (open.length) {
      // 맵이 작아서 가장 가까운 칸을 매번 훑어 고른다
      let bi = 0;
      for (let i = 1; i < open.length; i++)
        if (cost[key(open[i].tx, open[i].ty)] < cost[key(open[bi].tx, open[bi].ty)]) bi = i;
      const c = open.splice(bi, 1)[0], ck = key(c.tx, c.ty);
      if (c.tx === to.tx && c.ty === to.ty) {
        const path = [];
        for (let n = c; n; n = prev[key(n.tx, n.ty)]) path.unshift(n);
        return path.slice(1);
      }
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = c.tx + dx, ny = c.ty + dy, nk = key(nx, ny);
          if ((!dx && !dy) || this.isSolid(nx, ny)) continue;
          if (dx && dy && (this.isSolid(c.tx + dx, c.ty) || this.isSolid(c.tx, c.ty + dy))) continue;
          const nc = cost[ck] + (dx && dy ? Math.SQRT2 : 1);
          if (nk in cost && cost[nk] <= nc) continue;
          if (!(nk in cost)) open.push({ tx: nx, ty: ny });
          cost[nk] = nc;
          prev[nk] = c;
        }
    }
    return null;
  },

  // 막힌 칸(작업대 · 손님 자리 등) 옆으로 가는 가장 짧은 길. 옆 칸 { tx, ty }와 길을 돌려준다
  pathBeside(from, to) {
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const t = { tx: to.tx + dx, ty: to.ty + dy };
      if (this.isSolid(t.tx, t.ty)) continue;
      const path = t.tx === from.tx && t.ty === from.ty ? [] : this.findPath(from, t);
      if (path && (!best || path.length < best.path.length)) best = { ...t, path };
    }
    return best;
  },

  // 두 점(게임 픽셀) 사이 일자로 막힌 칸이 없는가. 몸 폭(r)만큼 양옆도 본다
  clearLine(x0, y0, x1, y1, r) {
    const T = CONFIG.tile, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r], [0, 0]])
        if (this.isSolid(Math.floor((x + ox) / T), Math.floor((y + oy) / T))) return false;
    }
    return true;
  },
};
