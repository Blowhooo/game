// seed = 작물을 바꾸려고 고른 씨앗(한 번 쓰면 풀림), 평소엔 null
const state = { day: 1, seed: null };

World.init();
Farm.init(TUTORIAL.field);
Player.init();
Render.init();
Touch.init(Render.canvas);
Hud.init(state, () => {
  Farm.newDay();
  state.day++;
  Hud.say(state.day + '일째 아침');
});

// 줄을 누르면 가까운 끝부터 그 줄을 따라 일하고, 밭이 아니면 걸어가기만
Touch.onTap = t => {
  const row = Farm.rowAt(t.tx, t.ty);
  if (!row) {
    state.seed = null;
    Player.setJobs([{ ...t, act: false }]);
    return;
  }
  if (state.seed) {
    Hud.say(Farm.assign(row, state.seed));
    state.seed = null;
    if (!Farm.hasWork(row)) return;
  } else if (!row.crop) {
    Hud.say('씨앗을 골라 줄을 누르세요');
    return;
  } else if (!Farm.hasWork(row)) {
    const p = Farm.plot(row.tiles[0].tx, row.tiles[0].ty);
    Hud.say(CROPS[p.crop].name + ' 자라는 중 (' + (CROPS[p.crop].days - p.grown) + '일 남음)');
    return;
  }
  const tiles = [...row.tiles];
  const near = Math.abs(tiles[0].tx * CONFIG.tile - Player.x) > Math.abs(tiles[tiles.length - 1].tx * CONFIG.tile - Player.x);
  if (near) tiles.reverse();
  Player.setJobs(tiles.map(t => ({ ...t, act: true })));
};
Player.onArrive = job => {
  const msg = Farm.work(job.tx, job.ty);
  if (msg) Hud.say(msg);
};

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Player.update(dt);
  Render.frame();
  Hud.update(dt, state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
