const state = { day: 1, seed: Object.keys(CROPS)[0] };

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

// 밭에서 시작했으면 그은 칸마다 일하고, 아니면 마지막 칸으로 걸어가기만
Touch.onDone = (tiles, fromPlot) => {
  if (fromPlot) Player.setJobs(tiles.map(t => ({ ...t, act: true })));
  else Player.setJobs([{ ...tiles[tiles.length - 1], act: false }]);
};
Player.onArrive = job => {
  const msg = Farm.act(job.tx, job.ty, state.seed);
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
