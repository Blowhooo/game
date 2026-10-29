// 글자 정보는 캔버스 대신 HTML로 (작은 해상도에서 한글이 뭉개져서)
const Hud = {
  el: null, msgEl: null, msgTimer: 0,
  init() {
    this.el = document.getElementById('hud');
    this.msgEl = document.getElementById('msg');
  },
  say(text) {
    this.msgEl.textContent = text;
    this.msgTimer = 2;
  },
  update(dt, state) {
    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msgEl.textContent = '';
    const seeds = Object.entries(CROPS).map(([id, c], i) =>
      `<span class="${id === state.seed ? 'on' : ''}">[${i + 1}] ${c.name}</span>`).join(' ');
    const bag = Object.entries(CROPS).map(([id, c]) => `${c.name} ${Farm.bag[id] || 0}`).join(' · ');
    this.el.innerHTML =
      `<b>${state.day}일째</b> &nbsp; 씨앗: ${seeds} &nbsp; | &nbsp; 가방: ${bag}<br>` +
      `방향키/WASD 이동 · Space 하기(심기 · 캐기) · N 하루 넘기기(임시)`;
  },
};
