// 글자 · 버튼은 캔버스 대신 HTML로 (작은 해상도에서 한글이 뭉개져서)
const Hud = {
  topEl: null, msgEl: null, msgTimer: 0,

  init(state, onNextDay) {
    this.topEl = document.getElementById('top');
    this.msgEl = document.getElementById('msg');
    const seeds = document.getElementById('seeds');
    Object.entries(CROPS).forEach(([id, c], i) => {
      const b = document.createElement('button');
      b.innerHTML = `<small class="key">${i + 1}</small>${c.name}`;
      b.dataset.id = id;
      b.onclick = () => this.pick(state, id);
      seeds.append(b);
    });
    document.getElementById('nextDay').onclick = onNextDay;
    // PC 단축키: 숫자 = 씨앗
    addEventListener('keydown', e => {
      const id = Object.keys(CROPS)[Number(e.key) - 1];
      if (id) this.pick(state, id);
    });
  },
  // 씨앗 고르기. 같은 걸 다시 누르면 풀린다
  pick(state, id) {
    state.seed = state.seed === id ? null : id;
    if (state.seed) this.say('심을 줄을 누르세요');
  },
  say(text) {
    this.msgEl.textContent = text;
    this.msgTimer = 2;
  },
  update(dt, state) {
    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msgEl.textContent = '';
    for (const b of document.querySelectorAll('#seeds button')) b.classList.toggle('on', b.dataset.id === state.seed);
    const list = o => Object.entries(CROPS).filter(([id]) => o[id]).map(([id, c]) => `${c.name} ${o[id]}`).join(' · ') || '없음';
    const waiting = Wife.queue.length + (Wife.current ? 1 : 0);
    this.topEl.textContent = `${state.day}일째  |  가방 ${Farm.bagCount()}/${CONFIG.bagSize}: ${list(Farm.bag)}  |  손질 기다림: ${waiting}  |  손질 끝: ${list(Wife.ready)}`;
  },
};
