// 누르기 + 긋기 (→ docs/기술.md 1 조작). 손가락 · 마우스 모두 pointer 이벤트 하나로
const Touch = {
  tiles: [],       // 누른 칸, 밭에서 시작했으면 그은 밭 칸들(같은 칸은 한 번)
  onDone: null,    // 손을 떼면 부른다 (main에서 정함): (칸 목록, 밭에서 시작했는지)
  fromPlot: false,
  id: null,

  init(canvas) {
    canvas.addEventListener('pointerdown', e => {
      if (this.id !== null) return;
      this.id = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      const t = Render.toTile(e.clientX, e.clientY);
      this.fromPlot = !!Farm.plot(t.tx, t.ty);
      this.tiles = [t];
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== this.id || !this.fromPlot) return;
      const t = Render.toTile(e.clientX, e.clientY);
      if (!Farm.plot(t.tx, t.ty)) return;
      if (!this.tiles.some(o => o.tx === t.tx && o.ty === t.ty)) this.tiles.push(t);
    });
    const end = e => {
      if (e.pointerId !== this.id) return;
      this.id = null;
      if (e.type === 'pointerup') this.onDone?.(this.tiles, this.fromPlot);
      this.tiles = [];
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  },
};
