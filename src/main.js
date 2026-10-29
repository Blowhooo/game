// phase = 'day'(밭) → 'evening'(가게 안 장사) → 'night'(하루 끝). seed = 심으려고 고른 씨앗(한 번 쓰면 풀림)
const state = { day: 1, phase: 'day', seed: null };

// 장면 바꾸기: 맵 · 남편 · 아내 자리 · 화면 배율
function enterScene(scene) {
  World.load(scene);
  Player.setJobs([]);
  Player.init();
  Wife.enter(scene);
  Render.resize();
}

World.load('farm');
Farm.init(TUTORIAL.field);
Player.init();
Wife.enter('farm');
Render.init();
Touch.init(Render.canvas);
Hud.init(state, {
  phase() {
    state.seed = null;
    if (state.phase === 'day') {
      state.phase = 'evening';
      enterScene('shop');
      Shop.start(state.day <= TUTORIAL.days);
      Wife.say('evening');
    } else if (state.phase === 'evening') {
      endEvening();
    }
  },
  nextDay() {
    Hud.hideNight();
    Farm.newDay();
    state.day++;
    state.phase = 'day';
    enterScene('farm');
    Hud.say(state.day + '일째 아침');
  },
});

function endEvening() {
  // 아직 안 들어온 손님 · 앉아 있는 손님은 그냥 돌아간다
  Shop.missed += Shop.plan.length + Shop.customers.filter(c => !c.eating).length;
  Shop.plan = [];
  for (const c of [...Shop.customers]) Shop.leave(c);
  state.phase = 'night';
  Hud.night(state);
}

// 씨앗을 골랐으면 그은 칸에 심고, 안 골랐으면 그은 칸을 캔다. 작업대는 건네기, 그 밖은 걸어가기만
Touch.onDone = (tiles, fromPlot) => {
  const t = tiles[0];
  const seed = state.seed;
  state.seed = null;
  if (state.phase === 'night') return;
  // 저녁: 손님을 누르면 옆으로 가서 요리를 낸다
  if (state.phase === 'evening') {
    const c = Shop.at(t.tx, t.ty);
    if (!c || c.eating) { Player.setJobs(World.isSolid(t.tx, t.ty) ? [] : [{ ...t, act: false }]); return; }
    const beside = World.pathBeside(Player.tileNow(), t);
    if (beside) Player.setJobs([{ tx: beside.tx, ty: beside.ty, act: true, serve: c }]);
    return;
  }
  // 작업대: 옆까지 걸어가서 가방을 통째로 건넨다
  if (World.tile(t.tx, t.ty)?.give) {
    const beside = World.pathBeside(Player.tileNow(), t);
    if (beside) Player.setJobs([{ tx: beside.tx, ty: beside.ty, act: true, give: true }]);
    return;
  }
  if (!fromPlot) {
    Player.setJobs([{ ...t, act: false }]);
    return;
  }
  // 심기: 그은 순서대로, 자라는 중인 칸은 건너뛴다(다 자란 칸은 캐고 심는다)
  if (seed) {
    const todo = tiles.filter(o => { const p = Farm.plot(o.tx, o.ty); return !p.crop || Farm.isRipe(p); });
    if (!todo.length) { Hud.say('심을 빈 칸이 없어요'); return; }
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
  if (Farm.bagFull()) { Hud.say('가방이 가득 찼어요 — 작업대에 갖다주세요'); return; }
  Player.setJobs(ripe.map(o => ({ ...o, act: true })));
};

Player.onArrive = job => {
  if (job.give) { Wife.receive(Farm.bag); return; }
  if (job.serve) { const msg = Shop.serve(job.serve); if (msg) Hud.say(msg); return; }
  const msg = Farm.work(job.tx, job.ty, job.seed);
  if (msg) Hud.say(msg);
  // 가방이 차면 캐기만 남은 칸은 그만 간다(심을 빈 칸은 마저 간다)
  if (Farm.bagFull()) Player.jobs = Player.jobs.filter(j => j.seed && !Farm.plot(j.tx, j.ty).crop);
};

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Player.update(dt);
  Wife.update(dt);
  if (state.phase === 'evening') {
    Shop.update(dt);
    if (Shop.isOver()) endEvening();
  }
  Render.frame();
  Hud.update(dt, state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
