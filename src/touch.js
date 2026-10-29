// 누르기 (→ docs/기술.md 1 조작). 손가락 · 마우스 모두 pointer 이벤트 하나로
const Touch = {
  onTap: null,   // 누른 칸을 넘긴다 (main에서 정함)
  id: null,

  init(canvas) {
    canvas.addEventListener('pointerdown', e => {
      if (this.id === null) this.id = e.pointerId;
    });
    canvas.addEventListener('pointerup', e => {
      if (e.pointerId !== this.id) return;
      this.id = null;
      this.onTap?.(Render.toTile(e.clientX, e.clientY));
    });
    canvas.addEventListener('pointercancel', () => { this.id = null; });
  },
};
