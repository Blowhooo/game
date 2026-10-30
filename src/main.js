// phase = 'day'(낮) → 'night'(하루 끝 화면). seed = 심으려고 고른 씨앗(한 번 쓰면 풀림)
// min = 오늘 흐른 게임 속 분, fed = 오늘 채운 먹을 몫, snack = 오늘 새참 먹었나, restLeft = 쉰 덕분 버프가 남은 날
// crops = 소식으로 씨앗이 풀린 작물, hero = A가 가게에 남았나, born = 아기가 태어난 날(0 = 아직) (→ data/story.js)
const state = {
  day: 1, phase: 'day', min: 0, seed: null, money: TUTORIAL.start.money,
  tools: new Set(), crops: new Set(), fed: 0, snack: false, restLeft: 0, hero: false, born: 0,
};

World.load(MAP);
Farm.init(TUTORIAL.field);
Object.assign(Farm.seeds, TUTORIAL.start.seeds);
const testing = location.search.includes('test');
const loaded = !location.search.includes('new') && !testing && Save.read();
Store.init();
Player.init();
Wife.init();
if (state.hero) World.block(...STORY.hero.at);
Guests.init();
Render.init();
Touch.init(Render.canvas);
Hud.init(state, {
  endDay() { if (state.phase === 'day') endDay(); },
  rest() { if (state.phase === 'day' && state.min === 0) rest(); },
  nextDay,
  reset() { Save.clear(); location.search = ''; location.reload(); },
});
if (!loaded) Save.write();
Hud.say(loaded ? `${state.day}일째 아침부터 이어서` : '1일째 아침');
// 시험용 시작: 전날 밤까지 해 둔 것으로 하고 다음 날 아침으로 → A가 온다. 주소의 ?test는 지워서 다시 열면 이어서
if (testing) {
  const t = TUTORIAL.test;
  Object.assign(state, { day: t.day - 1, money: t.money });
  Object.assign(Farm.seeds, t.seeds);
  Cooking.served = t.served;
  for (const id of t.built) Build.progress[id] = BUILDINGS[id].work;
  for (const n of TOWN.news) { if (n.opens) World.opened.add(n.opens); if (n.crop) state.crops.add(n.crop); }
  history.replaceState(null, '', location.pathname);
  nextDay();
}

// 행동마다 드는 분: 새참 · 쉰 덕분이면 빨라진다
function costOf(kind) {
  let m = DAY.cost[kind];
  if (state.snack) m *= DAY.snack.mul - Build.effect('snack');
  if (state.restLeft > 0) m *= DAY.rest.mul;
  return Math.round(m);
}
// 게임 속 시간 흘리기: 시계와 아내 손질이 같이 간다
function advance(kind) {
  const min = costOf(kind);
  state.min += min;
  Wife.work(min);
}
const dayMinutes = () => (DAY.to - DAY.from) * 60;
// 오늘 먹을 몫: 식구가 늘면 는다 (→ docs/기획.md 5 일꾼도 먹는다)
const foodNeed = () => DAY.food + (state.hero ? STORY.hero.food : 0);
const hourNow = () => DAY.from + state.min / 60;

// 하루 끝(남편의 시계가 다 됐거나 「하루 마치기」): 남은 재료 정리 · 소식 · 밤 장면
function endDay() {
  Player.setJobs([]);
  state.seed = null;
  state.phase = 'night';
  // 가방에 남은 것도 아내에게 — 창고가 없으면 함께 다음 날로 남지 않는다
  Wife.receive(Farm.bag);
  const left = Wife.endDay();
  const summary = { served: Guests.served, earned: Guests.earned, left, keep: Build.effect('keep') };
  Guests.endDay();
  if (state.restLeft > 0) state.restLeft--;
  // 오늘 손님이 알려 준 소식은 오늘 밤부터
  const news = TOWN.news.find(n => n.day === state.day);
  if (news?.opens) World.opened.add(news.opens);
  if (news?.crop) state.crops.add(news.crop);
  // A가 오기 전엔 마을 사람의 A 이야기, 정한 날엔 출산 (→ data/story.js)
  const talk = !state.hero && STORY.talks.find(t => t.day === state.day);
  const birth = !state.born && state.day >= STORY.birth.day;
  if (birth) state.born = state.day;
  const night = () => Hud.night(state, summary, news, birth && { text: STORY.born + '<br><br>' + (Build.babyReady() ? STORY.ready : STORY.notReady) });
  if (talk) Hud.story(talk.lines, night); else night();
}

// 쉬는 날: 아침에만 고를 수 있다. 일하지 않고 둘이 보내는 장면 → 다음 며칠 버프 (→ docs/기획.md 4)
function rest() {
  Player.setJobs([]);
  state.seed = null;
  state.phase = 'night';
  state.restLeft = DAY.rest.days;
  Hud.rest(state);
}

function nextDay() {
  Hud.hideNight();
  Farm.newDay();
  Forest.newDay();
  Object.assign(state, { day: state.day + 1, phase: 'day', min: 0, fed: 0, snack: false });
  Player.setJobs([]);
  Player.init();
  Wife.place();
  // 가게를 다 지은 다음 날 아침 A가 나타난다. 장면을 보기 전에 저장해서 다시 열어도 한 번만
  const arrive = !state.hero && Build.done('shop');
  if (arrive) { state.hero = true; World.block(...STORY.hero.at); }
  Save.write();
  Hud.say(STORY.morning[state.day] || (state.born && state.day === state.born + Wife.restDays() + 1 && STORY.back) || state.day + '일째 아침');
  if (arrive) {
    state.phase = 'story';
    Hud.story(STORY.arrive, () => {
      state.phase = 'day';
      Hud.say(`${STORY.name}가 가게 일을 돕게 됐어요 — 아내 하루 장사 한도 +${STORY.hero.energy}, 먹을 몫 +${STORY.hero.food}`);
    });
  }
}

// 누른 칸에 맞는 일: 밭은 긋기, 작업대 · 아내는 건네기, 숲은 따기, 터는 짓기, 마을 가게는 들어가기, 그 밖은 걸어가기
Touch.onDone = (tiles, fromPlot) => {
  const t = tiles[0];
  const seed = state.seed;
  state.seed = null;
  if (state.phase !== 'day' || Store.isOpen()) return;
  const tile = World.tile(t.tx, t.ty);
  const [wx, wy] = WIFE.at;
  const goBeside = (job, target = t) => {
    const beside = World.pathBeside(Player.tileNow(), target);
    if (beside) Player.setJobs([{ tx: beside.tx, ty: beside.ty, act: true, ...job }]);
    else Hud.say('아직 갈 수 없어요');
  };
  // 마을 가게: 문 앞까지 걸어가서 들어간다
  if (tile?.shop) {
    const door = World.find(o => o?.shop === tile.shop && o.door)[0];
    const beside = World.pathBeside(Player.tileNow(), door);
    if (beside) Player.setJobs([{ tx: beside.tx, ty: beside.ty, act: true, store: tile.shop }]);
    else Hud.say('아직 갈 수 없어요');
    return;
  }
  if (tile?.give || (t.tx === wx && t.ty === wy)) return goBeside({ give: true });
  if (tile?.gather) return goBeside({ gather: t });
  if (tile?.build && Build.open(tile.build)) {
    if (Build.done(tile.build)) { Hud.say(`${BUILDINGS[tile.build].name} — ${BUILDINGS[tile.build].desc}`); return; }
    return goBeside({ build: tile.build }, World.find(o => o?.build === tile.build));
  }
  if (!fromPlot) {
    Player.setJobs([{ ...t, act: false }]);
    return;
  }
  // 심기: 그은 순서대로, 자라는 중인 칸은 건너뛴다(다 자란 칸은 캐고 심는다)
  if (seed) {
    const todo = tiles.filter(o => { const p = Farm.plot(o.tx, o.ty); return !p.crop || Farm.isRipe(p); });
    if (!todo.length) { Hud.say('심을 빈 칸이 없어요'); return; }
    if (!Farm.seeds[seed]) { Hud.say(CROPS[seed].name + ' 씨앗이 없어요'); return; }
    Player.setJobs(todo.map(o => ({ ...o, act: true, seed })));
    return;
  }
  // 캐기: 그은 칸 중 다 자란 것만, 그은 순서대로
  const ripe = tiles.filter(o => Farm.isRipe(Farm.plot(o.tx, o.ty)));
  if (!ripe.length) {
    const p = Farm.plot(t.tx, t.ty);
    if (!p.crop) Hud.say('씨앗을 고르고 심을 칸을 그으세요');
    else Hud.say(CROPS[p.crop].name + ' 자라는 중 (' + (CROPS[p.crop].days - p.grown) + '일 남음)');
    return;
  }
  if (Farm.bagFull()) { Hud.say('가방이 가득 찼어요 — 아내에게 갖다주세요'); return; }
  Player.setJobs(ripe.map(o => ({ ...o, act: true })));
};

Player.onArrive = job => {
  if (job.give) {
    const had = Wife.receive(Farm.bag);
    if (!had) Wife.say('empty');
    // 새참: 정오쯤부터 아내가 준비해 둔다. 들르면 챙겨 먹는다 (→ docs/기획.md 5)
    if (!state.snack && hourNow() >= DAY.snack.from) {
      state.snack = true;
      Wife.say('snack');
      Hud.say('새참 먹음 — 오늘은 일이 조금 빨라져요');
    }
    if (had) advance('give');
    return;
  }
  if (job.store) { advance('store'); Store.open(job.store); return; }
  if (job.gather) {
    const done = Forest.gather(job.gather.tx, job.gather.ty);
    if (done.msg) Hud.say(done.msg);
    if (done.cost) advance(done.cost);
    return;
  }
  if (job.build) {
    // 먹을 몫을 채워야 짓는다 — 벌이 아니라 순서 (→ docs/기획.md 5)
    if (state.fed < foodNeed()) { Hud.say('먹을 것부터 구해야 해…'); return; }
    const done = Build.work(job.build);
    Hud.say(done.msg);
    if (!done.ok) return;
    advance('build');
    if (done.finished) { if (job.build === 'shop') Wife.say('built'); return; }
    // 재료가 있는 동안 제자리에서 이어서 짓는다
    if (state.min < dayMinutes()) { Player.jobs.unshift({ ...job }); Player.pause = 0.4; }
    return;
  }
  // 캐기 · 심기는 한 일만큼 시간이 든다
  const done = Farm.work(job.tx, job.ty, job.seed);
  if (done.msg) Hud.say(done.msg);
  if (done.harvested) advance('harvest');
  if (done.planted) advance('plant');
  // 가방이 차면 캐기만 남은 칸은 그만 간다(심을 빈 칸은 마저 간다)
  if (Farm.bagFull()) Player.jobs = Player.jobs.filter(j => j.seed && !Farm.plot(j.tx, j.ty).crop);
};

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.phase === 'day') {
    // 낮은 남편이 행동할 때만 시계가 간다(걷기는 0). 지나가는 사람은 실제 시간으로 (→ docs/기획.md 4)
    Player.update(dt);
    Guests.update(dt);
    if (state.min >= dayMinutes()) endDay();
  }
  Wife.update(dt);
  Render.frame();
  Hud.update(dt, state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
