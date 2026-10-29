// 게임 속 시각: 단계 시작 시각 + 흐른 분, 10분 단위
function clock(state) {
  const d = DAY[state.phase];
  if (!d) return '밤';
  const h = Math.min(d.to, d.from + state.min / 60);
  const m = Math.floor((h % 1) * 6) * 10, hh = Math.floor(h);
  return `${hh < 12 ? '오전' : '오후'} ${hh > 12 ? hh - 12 : hh}:${String(m).padStart(2, '0')}`;
}

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
      b.innerHTML = `<small class="key">${i + 1}</small>${c.name} <span class="n"></span>`;
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
  // 하루를 마치는 장면: 날마다 돌아가며 하나 (→ docs/기획.md 4)
  // news = 오늘 손님이 알려 준 소식(있으면)
  night(state, news) {
    const n = NIGHTS[(state.day - 1) % NIGHTS.length];
    document.getElementById('nightDay').textContent =
      `${state.day}일째 끝 · 손님 ${Shop.served}명 · 번 돈 ${Shop.earned}` + (Shop.missed ? ` · ${Shop.missed}명 그냥 감` : '');
    document.getElementById('nightNews').innerHTML = news
      ? `손님이 말했다: ${news.line}<br>${TOWN.shops[news.opens].name} 가는 문이 열렸다` : '';
    document.getElementById('nightText').innerHTML = n.text;
    const ctx = document.getElementById('nightArt').getContext('2d');
    for (const [x, y, w, h, c] of n.art) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
    document.getElementById('night').classList.add('on');
  },
  hideNight() { document.getElementById('night').classList.remove('on'); },

  update(dt, state) {
    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msgEl.textContent = '';
    document.getElementById('seeds').style.visibility = state.phase === 'day' ? 'visible' : 'hidden';
    for (const b of document.querySelectorAll('#seeds button')) {
      b.classList.toggle('on', b.dataset.id === state.seed);
      b.querySelector('.n').textContent = Farm.seeds[b.dataset.id] || 0;
    }
    const phaseBtn = document.getElementById('phaseBtn');
    phaseBtn.textContent = '일찍 문 열기';
    phaseBtn.style.visibility = state.phase === 'day' ? 'visible' : 'hidden';

    const list = o => Object.entries(CROPS).filter(([id]) => o[id]).map(([id, c]) => `${c.name} ${o[id]}`).join(' · ') || '없음';
    const waiting = Wife.queue.length + (Wife.current ? 1 : 0);
    const parts = [`${state.day}일째 ${clock(state)}`, `돈 ${state.money}`];
    if (state.phase === 'day') parts.push(`가방 ${Farm.bagCount()}/${CONFIG.bagSize}: ${list(Farm.bag)}`);
    parts.push(`손질 기다림: ${waiting}`, `손질 끝: ${list(Wife.ready)}`);
    if (state.phase !== 'day') parts.push(`손님 ${Shop.served}명`);
    this.topEl.textContent = parts.join('  |  ');
  },
};
