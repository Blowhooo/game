// 글자 · 버튼은 캔버스 대신 HTML로 (작은 해상도에서 한글이 뭉개져서)
const Hud = {
  topEl: null, msgEl: null, msgTimer: 0,

  // on = { phase(): 다음 단계로, nextDay(): 하루 끝 화면에서 다음 날로 }
  init(state, on) {
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
    document.getElementById('phaseBtn').onclick = on.phase;
    document.getElementById('nextDay').onclick = on.nextDay;
    // PC 단축키: 숫자 = 씨앗
    addEventListener('keydown', e => {
      const id = Object.keys(CROPS)[Number(e.key) - 1];
      if (id && state.phase === 'day') this.pick(state, id);
    });
  },
  // 씨앗 고르기. 같은 걸 다시 누르면 풀린다
  pick(state, id) {
    state.seed = state.seed === id ? null : id;
    if (state.seed) this.say('심을 칸을 그으세요');
  },
  say(text) {
    this.msgEl.textContent = text;
    this.msgTimer = 2;
  },
  // 하루 끝 화면 (밤 장면은 4단계에서)
  night(state) {
    document.getElementById('nightText').innerHTML =
      `${state.day}일째 끝<br>손님 ${Shop.served}명 받음` + (Shop.missed ? ` · ${Shop.missed}명 그냥 감` : '');
    document.getElementById('night').classList.add('on');
  },
  hideNight() { document.getElementById('night').classList.remove('on'); },

  update(dt, state) {
    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msgEl.textContent = '';
    document.getElementById('seeds').style.visibility = state.phase === 'day' ? 'visible' : 'hidden';
    for (const b of document.querySelectorAll('#seeds button')) b.classList.toggle('on', b.dataset.id === state.seed);
    const phaseBtn = document.getElementById('phaseBtn');
    phaseBtn.textContent = state.phase === 'day' ? '저녁 장사 시작 (임시)' : '장사 끝 (임시)';
    phaseBtn.style.visibility = state.phase === 'night' ? 'hidden' : 'visible';

    const list = o => Object.entries(CROPS).filter(([id]) => o[id]).map(([id, c]) => `${c.name} ${o[id]}`).join(' · ') || '없음';
    const waiting = Wife.queue.length + (Wife.current ? 1 : 0);
    const parts = [`${state.day}일째 ${state.phase === 'day' ? '낮' : '저녁'}`];
    if (state.phase === 'day') parts.push(`가방 ${Farm.bagCount()}/${CONFIG.bagSize}: ${list(Farm.bag)}`);
    parts.push(`손질 기다림: ${waiting}`, `손질 끝: ${list(Wife.ready)}`);
    if (state.phase !== 'day') parts.push(`손님 ${Shop.served}명`);
    this.topEl.textContent = parts.join('  |  ');
  },
};
