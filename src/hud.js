// 글자 · 버튼은 캔버스 대신 HTML로 (작은 해상도에서 한글이 뭉개져서)
const Hud = {
  topEl: null, msgEl: null, msgTimer: 0,

  init(state, onNextDay) {
    this.topEl = document.getElementById('top');
    this.msgEl = document.getElementById('msg');
    const seeds = document.getElementById('seeds');
    for (const [id, c] of Object.entries(CROPS)) {
      const b = document.createElement('button');
      b.textContent = c.name;
      b.dataset.id = id;
      b.onclick = () => { state.seed = id; };
      seeds.append(b);
    }
    document.getElementById('nextDay').onclick = onNextDay;
  },
  say(text) {
    this.msgEl.textContent = text;
    this.msgTimer = 2;
  },
  update(dt, state) {
    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msgEl.textContent = '';
    for (const b of document.querySelectorAll('#seeds button')) b.classList.toggle('on', b.dataset.id === state.seed);
    const bag = Object.entries(CROPS).map(([id, c]) => `${c.name} ${Farm.bag[id] || 0}`).join(' · ');
    this.topEl.textContent = `${state.day}일째   가방: ${bag}`;
  },
};
