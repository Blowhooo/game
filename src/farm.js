// 밭. 줄(이랑)마다 작물을 정하고, 칸마다 자란 정도를 센다. 작물 종류는 모르고 CROPS 데이터만 읽는다
const Farm = {
  rows: [],    // { tiles: [{tx, ty}], crop, next } — next = 다음에 캔 뒤 바꿀 작물(예약)
  plots: {},   // "x,y" → { crop, grown }
  bag: {},     // 캔 작물 → 개수

  // 맵에서 가로로 이어진 밭 칸을 한 줄로 묶고, 시작 밭을 데이터대로 채운다
  init(field) {
    for (let ty = 0; ty < World.h; ty++) {
      let row = null;
      for (let tx = 0; tx < World.w; tx++) {
        if (!World.tile(tx, ty)?.plot) { row = null; continue; }
        if (!row) this.rows.push(row = { tiles: [], crop: null, next: null });
        row.tiles.push({ tx, ty });
        this.plots[tx + ',' + ty] = { crop: null, grown: 0 };
      }
    }
    for (const { row, crop, ripe } of field) {
      const r = this.rows[row];
      r.crop = crop;
      for (const t of r.tiles) Object.assign(this.plot(t.tx, t.ty), { crop, grown: CROPS[crop].days - (ripe ? 0 : 1) });
    }
  },

  plot(tx, ty) { return this.plots[tx + ',' + ty] || null; },
  rowAt(tx, ty) { return this.rows.find(r => r.tiles.some(t => t.tx === tx && t.ty === ty)) || null; },
  isRipe(p) { return p.crop && p.grown >= CROPS[p.crop].days; },
  // 지금 손댈 칸이 있는가(다 자랐거나 비었거나)
  hasWork(row) { return row.tiles.some(t => { const p = this.plot(t.tx, t.ty); return !p.crop || this.isRipe(p); }); },

  // 줄의 작물 바꾸기. 손댈 칸이 있으면 바로, 다 자라는 중이면 예약
  assign(row, seed) {
    const name = CROPS[seed].name;
    if (!row.crop) { row.crop = seed; return name + ' 심으러 감'; }
    row.next = seed === row.crop ? null : seed;
    if (!row.next) return '그대로 ' + name;
    return this.hasWork(row) ? name + '(으)로 바꾸러 감' : '다음에 캔 뒤 ' + name + '(으)로 바뀜';
  },

  // 칸 하나 일: 다 자랐으면 캐고, 빈 칸이면 그 줄 작물(예약이 있으면 예약 작물)을 심는다
  work(tx, ty) {
    const p = this.plot(tx, ty), row = this.rowAt(tx, ty);
    if (!p || !row) return null;
    let msg = null;
    if (this.isRipe(p)) {
      this.bag[p.crop] = (this.bag[p.crop] || 0) + 1;
      msg = CROPS[p.crop].name + ' 캠';
      p.crop = null;
    }
    if (!p.crop) {
      p.crop = row.next || row.crop;
      p.grown = 0;
      if (!p.crop) return '씨앗을 골라 줄을 누르세요';
      msg = (msg ? msg + ' · ' : '') + CROPS[p.crop].name + ' 심음';
      // 예약 작물이 줄 전체에 심기면 그 줄 작물이 된다
      if (row.next && row.tiles.every(t => this.plot(t.tx, t.ty).crop === row.next)) { row.crop = row.next; row.next = null; }
    }
    return msg;
  },

  // 하루에 한 단계씩 저절로 자란다 (→ docs/기획.md 5)
  newDay() {
    for (const p of Object.values(this.plots))
      if (p.crop && !this.isRipe(p)) p.grown++;
  },
};
