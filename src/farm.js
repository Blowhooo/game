// 밭. 줄(이랑)로 나뉘고, 칸마다 캐고 심는다. 작물 종류는 모르고 CROPS 데이터만 읽는다
const Farm = {
  rows: [],    // { tiles: [{tx, ty}] }
  plots: {},   // "x,y" → { crop, grown }
  bag: {},     // 캔 작물 → 개수
  seeds: {},   // 가진 씨앗 → 개수 (잡화점에서 산다)

  // 맵에서 가로로 이어진 밭 칸을 한 줄로 묶고, 시작 밭을 데이터대로 채운다
  init(field) {
    for (let ty = 0; ty < World.h; ty++) {
      let row = null;
      for (let tx = 0; tx < World.w; tx++) {
        if (!World.tile(tx, ty)?.plot) { row = null; continue; }
        if (!row) this.rows.push(row = { tiles: [] });
        row.tiles.push({ tx, ty });
        this.plots[tx + ',' + ty] = { crop: null, grown: 0 };
      }
    }
    for (const { row, crop, ripe } of field)
      for (const t of this.rows[row].tiles)
        Object.assign(this.plot(t.tx, t.ty), { crop, grown: CROPS[crop].days - (ripe ? 0 : 1) });
  },

  plot(tx, ty) { return World.scene === 'farm' ? this.plots[tx + ',' + ty] || null : null; },
  bagCount() { return Object.values(this.bag).reduce((a, n) => a + n, 0); },
  bagFull() { return this.bagCount() >= CONFIG.bagSize; },
  isRipe(p) { return p.crop && p.grown >= CROPS[p.crop].days; },

  // 칸 하나 일: 다 자랐으면 캐고, seed가 있으면 빈 칸에 심는다. 캔 자리는 저절로 다시 심지 않는다
  // 돌려주는 것: { msg, harvested, planted }
  work(tx, ty, seed) {
    const p = this.plot(tx, ty), done = { msg: null, harvested: false, planted: false };
    if (!p) return done;
    const msg = [];
    if (this.isRipe(p) && this.bagFull()) msg.push('가방이 가득 찼어요');
    else if (this.isRipe(p)) {
      this.bag[p.crop] = (this.bag[p.crop] || 0) + 1;
      msg.push(CROPS[p.crop].name + ' 캠');
      p.crop = null;
      done.harvested = true;
    }
    if (!p.crop && seed && !this.seeds[seed]) msg.push(CROPS[seed].name + ' 씨앗이 없어요');
    else if (!p.crop && seed) {
      this.seeds[seed]--;
      p.crop = seed; p.grown = 0;
      msg.push(CROPS[seed].name + ' 심음');
      done.planted = true;
    }
    done.msg = msg.join(' · ') || null;
    return done;
  },

  // 하루에 한 단계씩 저절로 자란다 (→ docs/기획.md 5)
  newDay() {
    for (const p of Object.values(this.plots))
      if (p.crop && !this.isRipe(p)) p.grown++;
  },
};
