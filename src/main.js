const state = { day: 1, seed: Object.keys(CROPS)[0] };

Input.init();
World.init();
Player.init();
Render.init();
Hud.init();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  Object.keys(CROPS).forEach((id, i) => {
    if (Input.wasPressed('Digit' + (i + 1))) state.seed = id;
  });
  Player.update(dt);
  if (Input.wasPressed('Space', 'KeyE')) {
    const { tx, ty } = Player.target();
    const msg = Farm.act(tx, ty, state.seed);
    if (msg) Hud.say(msg);
  }
  if (Input.wasPressed('KeyN')) {
    Farm.newDay();
    state.day++;
    Hud.say(state.day + '일째 아침');
  }

  Render.frame();
  Hud.update(dt, state);
  Input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
