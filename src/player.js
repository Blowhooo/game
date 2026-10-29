// 남편. x, y = 발 가운데(게임 픽셀, 소수점 유지)
const DIRS = {
  down:  { dx: 0,  dy: 1 },
  right: { dx: 1,  dy: 0 },
  up:    { dx: 0,  dy: -1 },
  left:  { dx: -1, dy: 0 },
};

const Player = {
  x: 0, y: 0, dir: 'down',
  jobs: [],          // 할 일 줄: { tx, ty, act } — act면 도착해서 그 칸에 일한다
  path: [],          // 지금 가는 길(칸)
  onArrive: null,    // 할 일 칸에 닿으면 부른다 (main에서 정함)
  pause: 0,          // 제자리에서 일을 이어 할 때 한 번마다 쉬는 실제 초(짓기 손맛)

  init() {
    this.place(World.start.x, World.start.y);
  },
  place(tx, ty) { Object.assign(this, this.spot(tx, ty)); },
  // 칸 안에서 서는 자리
  spot(tx, ty) {
    const T = CONFIG.tile;
    return { x: tx * T + T / 2, y: ty * T + T - 4 };
  },
  tileNow() {
    const T = CONFIG.tile;
    return { tx: Math.floor(this.x / T), ty: Math.floor(this.y / T) };
  },

  // 새로 누르거나 그으면 하던 일을 버리고 새 줄로 바꾼다
  setJobs(jobs) {
    this.jobs = jobs;
    this.path = [];
    this.pause = 0;
    this.nextJob();
  },
  nextJob() {
    while (this.jobs.length) {
      const path = World.findPath(this.tileNow(), this.jobs[0]);
      if (path) { this.path = path; return; }
      this.jobs.shift();   // 못 가는 칸은 건너뛴다
    }
  },

  update(dt) {
    if (!this.jobs.length) return;
    if (this.pause > 0) { this.pause -= dt; return; }
    let step = CONFIG.playerSpeed * dt;
    while (step > 0) {
      if (!this.path.length) {
        const job = this.jobs.shift();
        if (job.act) this.onArrive?.(job);
        this.nextJob();
        return;
      }
      // 일자로 갈 수 있는 가장 먼 칸까지는 중간 칸을 건너뛴다
      while (this.path.length > 1) {
        const far = this.spot(this.path[1].tx, this.path[1].ty);
        if (!World.clearLine(this.x, this.y, far.x, far.y, 5)) break;
        this.path.shift();
      }
      const goal = this.spot(this.path[0].tx, this.path[0].ty);
      const dx = goal.x - this.x, dy = goal.y - this.y, d = Math.hypot(dx, dy);
      // 대각선이면 옆을 본다 (→ docs/기술.md 1 방향)
      if (Math.abs(dx) > 0.01) this.dir = dx > 0 ? 'right' : 'left';
      else if (Math.abs(dy) > 0.01) this.dir = dy > 0 ? 'down' : 'up';
      if (d <= step) {
        this.x = goal.x; this.y = goal.y;
        this.path.shift();
        step -= d;
      } else {
        // 두 축을 같은 비율로 (→ docs/기술.md 1 이동)
        this.x += dx / d * step; this.y += dy / d * step;
        step = 0;
      }
    }
  },
};
