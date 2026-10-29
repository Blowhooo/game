// 남편. x, y = 발 가운데(게임 픽셀, 소수점 유지)
const DIRS = {
  down:  { dx: 0,  dy: 1 },
  right: { dx: 1,  dy: 0 },
  up:    { dx: 0,  dy: -1 },
  left:  { dx: -1, dy: 0 },
};

const Player = {
  x: 0, y: 0, dir: 'down',

  init() {
    const T = CONFIG.tile;
    this.x = World.start.x * T + T / 2;
    this.y = World.start.y * T + T - 2;
  },

  update(dt) {
    let mx = 0, my = 0;
    if (Input.isDown('ArrowLeft', 'KeyA')) mx--;
    if (Input.isDown('ArrowRight', 'KeyD')) mx++;
    if (Input.isDown('ArrowUp', 'KeyW')) my--;
    if (Input.isDown('ArrowDown', 'KeyS')) my++;
    if (!mx && !my) return;

    // 대각선이면 옆을 본다 (→ docs/기술.md 1 방향)
    if (mx) this.dir = mx > 0 ? 'right' : 'left';
    else this.dir = my > 0 ? 'down' : 'up';

    const step = CONFIG.playerSpeed * dt / Math.hypot(mx, my);
    // 축마다 따로 막아서 벽을 따라 미끄러지게
    this.tryMove(mx * step, 0);
    this.tryMove(0, my * step);
  },

  tryMove(dx, dy) {
    const nx = this.x + dx, ny = this.y + dy;
    if (!this.hits(nx, ny)) { this.x = nx; this.y = ny; }
  },

  hits(x, y) {
    const T = CONFIG.tile, { w, h } = CONFIG.playerHitbox;
    const l = Math.floor((x - w / 2) / T), r = Math.floor((x + w / 2 - 0.01) / T);
    const t = Math.floor((y - h) / T),     b = Math.floor((y - 0.01) / T);
    for (let ty = t; ty <= b; ty++)
      for (let tx = l; tx <= r; tx++)
        if (World.isSolid(tx, ty)) return true;
    return false;
  },

  // 바라보는 앞 칸
  target() {
    const T = CONFIG.tile, d = DIRS[this.dir];
    return {
      tx: Math.floor(this.x / T) + d.dx,
      ty: Math.floor((this.y - 1) / T) + d.dy,
    };
  },
};
