// 누르고 있는 키 + 이번 프레임에 새로 누른 키
const Input = {
  down: new Set(),
  pressed: new Set(),
  init() {
    addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
  },
  isDown(...codes) { return codes.some(c => this.down.has(c)); },
  wasPressed(...codes) { return codes.some(c => this.pressed.has(c)); },
  endFrame() { this.pressed.clear(); },
};
