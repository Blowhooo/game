// 게임 속 시각: 하루 시작 시각 + 흐른 분, 10분 단위
function clock(state) {
  if (state.phase !== 'day') return '밤';
  const h = Math.min(DAY.to, DAY.from + state.min / 60);
  const m = Math.floor((h % 1) * 6) * 10, hh = Math.floor(h);
  return `${hh < 12 ? '오전' : '오후'} ${hh > 12 ? hh - 12 : hh}:${String(m).padStart(2, '0')}`;
}
// 씨앗을 살 수 있거나 가진 밭 작물
const seedCrops = state => Object.keys(CROPS).filter(id => !CROPS[id].wild && (!CROPS[id].locked || state.crops.has(id) || Farm.seeds[id]));

// 글자 · 버튼은 캔버스 대신 HTML로 (작은 해상도에서 한글이 뭉개져서)
const Hud = {
  topEl: null, msgEl: null, msgTimer: 0,

  // on = { endDay(): 하루 마치기, rest(): 오늘은 쉬기, nextDay(): 밤 화면에서 다음 날로, reset(): 처음부터 }
  init(state, on) {
    this.topEl = document.getElementById('top');
    this.msgEl = document.getElementById('msg');
    const seeds = document.getElementById('seeds');
    Object.entries(CROPS).filter(([, c]) => !c.wild).forEach(([id, c], i) => {
      const b = document.createElement('button');
      b.innerHTML = `<small class="key">${i + 1}</small>${c.name} <span class="n"></span>`;
      b.dataset.id = id;
      b.onclick = () => this.pick(state, id);
      seeds.append(b);
    });
    document.getElementById('endBtn').onclick = on.endDay;
    document.getElementById('restBtn').onclick = on.rest;
    document.getElementById('nextDay').onclick = on.nextDay;
    document.getElementById('resetBtn').onclick = on.reset;
    document.getElementById('mapBtn').onclick = () => this.toggleMap();
    // PC 단축키: 숫자 = 씨앗, M = 지도
    addEventListener('keydown', e => {
      if (e.key === 'm' || e.key === 'M') return this.toggleMap();
      const id = Object.keys(CROPS).filter(c => !CROPS[c].wild)[Number(e.key) - 1];
      if (id && state.phase === 'day' && seedCrops(state).includes(id)) this.pick(state, id);
    });
  },
  // 씨앗 고르기. 같은 걸 다시 누르면 풀린다
  pick(state, id) {
    state.seed = state.seed === id ? null : id;
    if (state.seed) this.say('심을 칸을 그으세요');
  },
  // 전체 지도: 보기만 한다(누른 곳으로 가지 않음). 시간은 그대로 흐른다
  toggleMap() {
    Render.mapOpen = !Render.mapOpen;
    document.getElementById('mapBtn').classList.toggle('on', Render.mapOpen);
    document.getElementById('mapKey').style.display = Render.mapOpen ? '' : 'none';
  },
  say(text) {
    this.msgEl.textContent = text;
    this.msgTimer = 2.5;
  },

  // 밤 화면: (장면이 있으면 그림 + 글) + 아래 줄들
  show(title, scene, lines) {
    document.getElementById('nightDay').textContent = title;
    document.getElementById('nightNews').innerHTML = lines.filter(Boolean).join('<br>');
    document.getElementById('nightText').innerHTML = scene ? scene.text : '';
    const art = document.getElementById('nightArt'), ctx = art.getContext('2d');
    art.style.display = scene ? '' : 'none';
    if (scene) for (const [x, y, w, h, c] of scene.art) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
    document.getElementById('night').classList.add('on');
  },
  // 하루 끝: 장면 없이 오늘 결과만 (→ docs/기획.md 4). news = 오늘 손님이 알려 준 소식(있으면)
  night(state, s, news) {
    this.show(`${state.day}일째 끝 · 손님 ${s.served}명 · 번 돈 ${s.earned}`, null, [
      s.left && (s.keep ? `남은 재료 ${s.left}개는 창고에` : `남은 재료 ${s.left}개 (창고가 있으면 내일까지 둘 수 있어요)`),
      news && `손님이 말했다: ${news.line}`,
      news?.opens && `${TOWN.shops[news.opens].name} 가는 문이 열렸다`,
      news?.crop && `${CROPS[news.crop].name} 씨앗을 살 수 있다`,
    ]);
  },
  rest(state) {
    this.show(`${state.day}일째 · 쉬는 날`, RESTS[(state.day - 1) % RESTS.length],
      [`푹 쉬었다 — 다음 ${DAY.rest.days}일 동안 몸이 가볍고, 아내도 힘이 난다`]);
  },
  hideNight() { document.getElementById('night').classList.remove('on'); },

  // 처음 이틀은 지금 할 일을 한 줄로 알려 준다 — 임시 색 네모라 무엇이 무엇인지 안 보여서
  hint(state) {
    if (state.day > TUTORIAL.days || state.phase !== 'day') return '';
    if (state.fed < DAY.food && !Farm.bagCount()) return '밭(갈색)에서 다 자란 칸을 그어 캐요 — 먹을 것이 먼저 필요해요';
    if (state.fed < DAY.food || Farm.bagCount()) return '캔 것은 아내 옆 작업대(살구색)를 눌러 건네요 — 우리 먹을 몫을 먼저 떼고, 나머지를 팔아요';
    if (Build.done('shop')) return '가게 완성! 다음은 창고 터(오른쪽 위)를 지을 수 있어요';
    const need = Build.need('shop');
    if (Forest.wood < need.wood || Forest.stone < need.stone)
      return '가게를 지으려면 나무 · 돌이 필요해요 — 왼쪽 숲의 나무 · 바위를 눌러요. 빨간 열매 덤불은 먹을 것';
    return '아내 뒤 가게 터(테두리)를 눌러 지어요 — 나무 · 돌이 있는 만큼 이어서 지어요';
  },

  update(dt, state) {
    if (this.msgTimer > 0 && (this.msgTimer -= dt) <= 0) this.msgEl.textContent = '';
    document.getElementById('hint').textContent = this.hint(state);
    const day = state.phase === 'day';
    const shown = seedCrops(state);
    for (const b of document.querySelectorAll('#seeds button')) {
      b.style.display = day && shown.includes(b.dataset.id) ? '' : 'none';
      b.classList.toggle('on', b.dataset.id === state.seed);
      b.querySelector('.n').textContent = Farm.seeds[b.dataset.id] || 0;
    }
    document.getElementById('endBtn').style.visibility = day ? 'visible' : 'hidden';
    document.getElementById('restBtn').style.display = day && state.min === 0 ? '' : 'none';

    const list = o => Object.entries(CROPS).filter(([id]) => o[id]).map(([id, c]) => `${c.name} ${o[id]}`).join(' · ') || '없음';
    const buffs = [state.snack && '새참', state.restLeft > 0 && `쉰 덕분 ${state.restLeft}일`].filter(Boolean);
    const next = Cooking.next();
    const waiting = Wife.queue.length + (Wife.current ? 1 : 0);
    this.topEl.textContent = [
      [`${state.day}일째 ${clock(state)}`, `돈 ${state.money}`, `오늘 먹을 것 ${Math.min(state.fed, DAY.food)}/${DAY.food}`, buffs.join(' · ')].filter(Boolean).join('  |  '),
      [`가방 ${Farm.bagCount()}/${CONFIG.bagSize}: ${list(Farm.bag)}`, `나무 ${Forest.wood} · 돌 ${Forest.stone}`].join('  |  '),
      [`아내 — 손질 기다림 ${waiting} · 요리 ${Wife.readyCount()} · 기력 ${Math.max(0, Wife.energy() - Wife.sold)}/${Wife.energy()}`,
        next ? `다음 메뉴까지 ${Cooking.served}/${next.at}` : '메뉴 다 열림'].join('  |  '),
    ].join('\n');
  },
};
