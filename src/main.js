// seed = 작물을 바꾸려고 고른 씨앗(한 번 쓰면 풀림), 평소엔 null
const state = { day: 1, seed: null };

World.init();
Farm.init(TUTORIAL.field);
Player.init();
Wife.init();
Render.init();
Touch.init(Render.canvas);
Hud.init(state, () => {
  Farm.newDay();
  state.day++;
  Hud.say(state.day + '일째 아침');
});

// 줄을 누르면 가까운 끝부터 그 줄을 따라 일하고, 밭이 아니면 걸어가기만
Touch.onTap = t => {
  // 작업대: 옆까지 걸어가서 가방을 통째로 건넨다
  if (World.tile(t.tx, t.ty)?.give) {
    state.seed = null;
    const beside = World.pathBeside(Player.tileNow(), t);
    if (beside) Player.setJobs([{ tx: beside.tx, ty: beside.ty, act: true, give: true }]);
    return;
  }
  const row = Farm.rowAt(t.tx, t.ty);
  if (!row) {
    state.seed = null;
    Player.setJobs([{ ...t, act: false }]);
    return;
  }
  // 씨앗을 골랐으면 그 줄의 빈 칸에 심고(가는 길에 다 자란 건 캔다), 안 골랐으면 캐기만
  const seed = state.seed;
  state.seed = null;
  const ripe = Farm.rowHas(row, p => Farm.isRipe(p)), empty = Farm.rowHas(row, p => !p.crop);
  if (!ripe && !(seed && empty)) {
    const p = Farm.plot(row.tiles[0].tx, row.tiles[0].ty);
    if (!p.crop) Hud.say('씨앗을 골라 줄을 누르세요');
    else Hud.say(CROPS[p.crop].name + ' 자라는 중 (' + (CROPS[p.crop].days - p.grown) + '일 남음)');
    return;
  }
  const tiles = [...row.tiles];
  const near = Math.abs(tiles[0].tx * CONFIG.tile - Player.x) > Math.abs(tiles[tiles.length - 1].tx * CONFIG.tile - Player.x);
  if (near) tiles.reverse();
  Player.setJobs(tiles.map(t => ({ ...t, act: true, seed })));
};
Player.onArrive = job => {
  if (job.give) { Wife.receive(Farm.bag); return; }
  const msg = Farm.work(job.tx, job.ty, job.seed);
  if (msg) Hud.say(msg);
};

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Player.update(dt);
  Wife.update(dt);
  Render.frame();
  Hud.update(dt, state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
