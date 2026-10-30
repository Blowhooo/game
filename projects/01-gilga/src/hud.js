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
    // 처음부터: 잘못 누르지 않게 한 번 더 눌러야 지운다
    const reset = document.getElementById('resetBtn');
    reset.onclick = () => {
      if (reset.dataset.sure) return on.reset();
      reset.dataset.sure = 1;
      reset.textContent = '정말 지울까요? 한 번 더 누르면 처음부터';
      setTimeout(() => { delete reset.dataset.sure; reset.textContent = '처음부터 다시'; }, 3000);
    };
    document.getElementById('mapBtn').onclick = () => this.toggleMap();
    document.getElementById('bookBtn').onclick = () => this.openBook(state, 'items');
    document.getElementById('bookClose').onclick = () => document.getElementById('book').classList.remove('on');
    for (const t of document.querySelectorAll('#bookTabs button[data-tab]')) t.onclick = () => this.openBook(state, t.dataset.tab);
    // PC 단축키: 숫자 = 씨앗, M = 지도
    addEventListener('keydown', e => {
      if (e.key === 'm' || e.key === 'M') return this.toggleMap();
      if (e.key === 'b' || e.key === 'B') return this.openBook(state, 'items');
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
    art.style.display = scene?.art ? '' : 'none';
    if (scene?.art) for (const [x, y, w, h, c] of scene.art) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
    document.getElementById('night').classList.add('on');
  },
  // 하루 끝: 오늘 결과만 (→ docs/기획.md 4). news = 오늘 손님이 알려 준 소식, scene = 출산 같은 한 번뿐인 장면
  night(state, s, news, scene) {
    this.show(`${state.day}일째 끝 · 손님 ${s.served}명 · 번 돈 ${s.earned}`, scene || null, [
      s.left && (s.keep ? `남은 재료 ${s.left}개는 창고에` : `남은 재료 ${s.left}개 (창고가 있으면 내일까지 둘 수 있어요)`),
      news && `손님이 말했다: ${news.line}`,
      news?.opens && `${TOWN.shops[news.opens].name} 가는 문이 열렸다`,
      news?.crop && `${CROPS[news.crop].name} 씨앗을 살 수 있다`,
    ]);
  },
  rest(state) {
    this.show(`${state.day}일째 · 쉬는 날`, null,
      [`푹 쉬었다 — 다음 ${DAY.rest.days}일 동안 몸이 가볍고, 아내도 힘이 난다`]);
  },
  // 대화창: [말하는 사람, 대사]를 한 줄씩, 화면 아무 데나 누르면 다음. 끝나면 done() (→ data/story.js)
  // 얼굴 그림이 없으면 빈 틀에 그 사람 색 · 이름 첫 글자
  story(lines, done) {
    const el = document.getElementById('story'), box = document.getElementById('talkBox');
    const face = document.getElementById('talkFace'), name = document.getElementById('talkName'), text = document.getElementById('talkText');
    let i = 0;
    const show = () => {
      const [who, line] = lines[i], p = STORY.people[who];
      box.classList.toggle('narration', !p);
      face.style.display = name.style.display = p ? '' : 'none';
      if (p) {
        face.innerHTML = p.face ? `<img src="${p.face}">` : p.name[0];
        face.style.background = p.face ? '' : p.color;
        name.textContent = p.name;
      }
      text.textContent = line;
    };
    el.onclick = () => {
      if (++i < lines.length) return show();
      el.classList.remove('on');
      done();
    };
    show();
    el.classList.add('on');
  },
  // 수첩: 소지품 · 노트 두 탭. 열 때마다 새로 쓴다
  openBook(state, tab) {
    const row = (a, b = '') => `<li><span>${a}</span><b>${b}</b></li>`;
    const crops = o => Object.entries(CROPS).filter(([id]) => o[id]).map(([id, c]) => row(c.name, o[id] + '개')).join('') || row('없음');
    let html;
    if (tab === 'items') {
      html = `<h3>돈 · 재료</h3><ul>${row('돈', state.money)}${row('나무', Forest.wood)}${row('돌', Forest.stone)}</ul>`
        + `<h3>가방 ${Farm.bagCount()}/${CONFIG.bagSize}</h3><ul>${crops(Farm.bag)}</ul>`
        + `<h3>씨앗</h3><ul>${crops(Farm.seeds)}</ul>`
        + `<h3>도구</h3><ul>${[...state.tools].map(id => row(TOOLS[id].name, TOOLS[id].desc)).join('') || row('없음', '대장간에서 살 수 있어요')}</ul>`;
    } else {
      const menus = WIFE.cooking.filter(m => Cooking.served >= m.at), next = Cooking.next();
      const built = Object.keys(BUILDINGS).filter(id => Build.done(id));
      html = `<h3>아내의 메뉴</h3><ul>${menus.map(m => row(m.name, '값 ' + m.dish)).join('') || row('아직 없음')}`
        + row('다음 메뉴까지', next ? `${Cooking.served}/${next.at}그릇` : '다 열림') + '</ul>'
        + `<h3>지은 것</h3><ul>${built.map(id => row(BUILDINGS[id].name, BUILDINGS[id].desc)).join('') || row('아직 없음')}</ul>`
        + `<h3>기록</h3><ul>${[...state.log].reverse().map(l => row(`${l.day}일째`, l.text)).join('') || row('아직 없음')}</ul>`;
    }
    document.getElementById('bookBody').innerHTML = html;
    for (const t of document.querySelectorAll('#bookTabs button[data-tab]')) t.classList.toggle('on', t.dataset.tab === tab);
    document.getElementById('book').classList.add('on');
  },
  hideNight() { document.getElementById('night').classList.remove('on'); },

  // 처음 이틀은 지금 할 일을 한 줄로 알려 준다 — 임시 색 네모라 무엇이 무엇인지 안 보여서
  hint(state) {
    if (state.day > TUTORIAL.days || state.phase !== 'day') return '';
    if (state.fed < foodNeed() && !Farm.bagCount()) return '밭(갈색)에서 다 자란 칸을 그어 캐요 — 먹을 것이 먼저 필요해요';
    if (state.fed < foodNeed() || Farm.bagCount()) return '캔 것은 아내 옆 작업대(살구색)를 눌러 건네요 — 우리 먹을 몫을 먼저 떼고, 나머지를 팔아요';
    if (Build.done('shop')) return '가게 완성! 다음은 창고 터(오른쪽 위)를 지을 수 있어요';
    const need = Build.need('shop');
    if (Forest.wood < need.wood || Forest.stone < need.stone)
      return '가게를 지으려면 나무 · 돌이 필요해요 — 왼쪽 숲의 나무 · 바위를 눌러요. 빨간 열매 덤불은 먹을 것';
    return '아내 뒤 가게 터(테두리)를 눌러 지어요 — 나무 · 돌이 있는 만큼 이어서 지어요';
  },

  // 미션 칸: 메인 미션(끝내면 다음 이야기) + 곁 미션(창고)을 화면 오른쪽 위에 늘 (→ docs/기획.md 6 · 9). { title, sub, ids: 지을 것들 }
  goal(state) {
    if (!Build.done('shop')) return { title: '아내의 가게 짓기', ids: ['shop'] };
    if (!state.born) return { title: '아기 맞을 준비', sub: '다 지으면 아기가 와요', ids: Object.keys(BUILDINGS).filter(id => BUILDINGS[id].baby) };
    return null;
  },
  goalHtml(state) {
    if (state.phase !== 'day') return '';
    const g = this.goal(state), side = !Build.done('storage') && Build.open('storage');
    if (!g && !side) return '';
    const item = id => {
      const b = BUILDINGS[id], done = Build.done(id);
      if (done) return `<li class="done">✓ ${b.name}</li>`;
      // 남은 재료: 가진 게 모자라면 붉게
      const left = Build.left(id), have = { wood: Forest.wood, stone: Forest.stone };
      const mats = [['wood', '나무'], ['stone', '돌']].filter(([k]) => left[k])
        .map(([k, n]) => `<i class="${have[k] < left[k] ? 'lack' : ''}">${n} ${left[k]}</i>`).join(' · ');
      return `<li>☐ ${b.name} <b>${Build.progress[id] || 0}/${b.work}</b> <small>${b.where}</small>${mats ? `<div class="mats">필요: ${mats}</div>` : ''}</li>`;
    };
    const main = g ? `<div class="gt">${g.title}</div>${g.sub ? `<div class="gs">${g.sub}</div>` : ''}<ul>${g.ids.map(item).join('')}</ul>` : '';
    return main + (side ? `<div class="gside">곁 미션</div><ul>${item('storage')}</ul>` : '');
  },

  update(dt, state) {
    const goal = document.getElementById('goal'), html = this.goalHtml(state);
    if (goal.innerHTML !== html) goal.innerHTML = html;
    goal.style.display = html ? '' : 'none';
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

    // 위쪽은 자주 보는 것만. 나머지는 수첩(B)
    const buffs = [state.snack && '새참', state.restLeft > 0 && `쉰 덕분 ${state.restLeft}일`].filter(Boolean);
    const waiting = Wife.queue.length + (Wife.current ? 1 : 0), left = `기력 ${Math.max(0, Wife.energy() - Wife.sold)}/${Wife.energy()}`;
    this.topEl.textContent = [
      [`${state.day}일째 ${clock(state)}`, `돈 ${state.money}`, `오늘 먹을 것 ${Math.min(state.fed, foodNeed())}/${foodNeed()}`, `가방 ${Farm.bagCount()}/${CONFIG.bagSize}`, `나무 ${Forest.wood} · 돌 ${Forest.stone}`, buffs.join(' · ')].filter(Boolean).join('  |  '),
      Wife.resting() ? `아내 — 아기 보며 쉬는 중 · 가게는 ${STORY.name}가 · ${left}` : `아내 — 손질 기다림 ${waiting} · 요리 ${Wife.readyCount()} · ${left}`,
    ].join('\n');
  },
};
