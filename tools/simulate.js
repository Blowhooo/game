// 하루 단위 시뮬레이션: 게임 규칙대로 며칠을 자동으로 플레이해 날마다 숫자를 보여 준다 (→ docs/밸런스.md 4)
// 쓰는 법: node tools/simulate.js [며칠=7] [손님 메뉴 난수 씨앗=1]
// 규칙은 src/*.js를 옮겨 적은 것 — 게임 규칙을 바꾸면 여기도 맞춘다
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {};
vm.createContext(ctx);
for (const f of ['config', 'tiles', 'map', 'crops', 'tutorial', 'customers', 'day', 'town'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', f + '.js'), 'utf8').replace(/^const /gm, 'var '), ctx);
const { CONFIG, SCENES, TILES, CROPS, TUTORIAL, CUSTOMERS, DAY, TOWN, TOOLS } = ctx;

const days = Number(process.argv[2] || 7);
let rnd = Number(process.argv[3] || 1);
const random = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
const cfg = { ...CONFIG };
const cost = DAY.day.cost, dayLen = (DAY.day.to - DAY.day.from) * 60, eveLen = (DAY.evening.to - DAY.evening.from) * 60;
const names = Object.keys(CROPS);

// 밭: 맵에서 줄마다 칸
const rows = [];
SCENES.farm.forEach((r, y) => {
  let row = null;
  [...r].forEach((c, x) => {
    if (!TILES[c]?.plot) { row = null; return; }
    if (!row) rows.push(row = []);
    row.push({ crop: null, grown: 0 });
  });
});
for (const { row, cols, crop, ripe } of TUTORIAL.field)
  for (const i of cols) Object.assign(rows[row][i], { crop, grown: CROPS[crop].days - (ripe ? 0 : 1) });
const plots = rows.flat();
const isRipe = p => p.crop && p.grown >= CROPS[p.crop].days;

const s = { money: TUTORIAL.start.money, seeds: { ...TUTORIAL.start.seeds }, tools: new Set(), opened: new Set() };
const wife = { queue: [], cur: null, ready: {}, idle: 0 };
function wifeWork(min) {
  while (min > 0) {
    if (!wife.cur && wife.queue.length) wife.cur = { crop: wife.queue.shift(), t: 0 };
    if (!wife.cur) { wife.idle += min; return; }
    const need = CROPS[wife.cur.crop].prep * cfg.prepMul - wife.cur.t;
    if (min < need) { wife.cur.t += min; return; }
    min -= need;
    wife.ready[wife.cur.crop] = (wife.ready[wife.cur.crop] || 0) + 1;
    wife.cur = null;
  }
}

const fmt = min => { const h = DAY.day.from + min / 60; return `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; };
const list = o => names.filter(id => o[id]).map(id => `${CROPS[id].name}${o[id]}`).join(' ') || '-';
const out = [];

for (let day = 1; day <= days; day++) {
  if (day > 1) for (const p of plots) if (p.crop && !isRipe(p)) p.grown++;
  let min = 0, harvested = 0, planted = 0;
  const notes = [], bag = {};
  wife.idle = 0;
  const spend = m => { if (min + m > dayLen) return false; min += m; wifeWork(m); return true; };
  const give = () => {
    const items = names.flatMap(id => Array(bag[id] || 0).fill(id));
    if (items.length && spend(cost.give)) { wife.queue.push(...items); for (const k in bag) delete bag[k]; }
  };

  // 1. 다 자란 것을 가방만큼 캐서 건네기를 되풀이
  for (const p of plots.filter(isRipe)) {
    if (Object.values(bag).reduce((a, n) => a + n, 0) >= cfg.bagSize) give();
    if (!spend(cost.harvest)) break;
    bag[p.crop] = (bag[p.crop] || 0) + 1; p.crop = null; harvested++;
  }
  give();

  // 2. 대장간이 열렸고 도구 살 돈이 있으면(씨앗 살 돈은 남기고) 다녀온다
  const seedReserve = 4 * Math.max(...names.map(id => CROPS[id].seed)) * 2;
  if (s.opened.has('smith')) {
    const want = TOWN.shops.smith.tools.filter(id => !s.tools.has(id) && s.money - TOOLS[id].price >= seedReserve);
    if (want.length && spend(cost.store)) for (const id of want) {
      if (s.money - TOOLS[id].price < seedReserve) continue;
      s.money -= TOOLS[id].price; s.tools.add(id); Object.assign(cfg, TOOLS[id].effect); notes.push(`${TOOLS[id].name} 삼`);
    }
  }

  // 3. 빈 칸만큼 씨앗이 모자라면 종묘상에 다녀온다 — 작물이 고르게 섞이도록 적은 것부터
  const empty = () => plots.filter(p => !p.crop);
  const have = () => names.reduce((a, id) => a + (s.seeds[id] || 0), 0);
  if (s.opened.has('general') && empty().length > have()) {
    const bundle = TOWN.shops.general.seeds;
    const count = id => plots.filter(p => p.crop === id).length + (s.seeds[id] || 0);
    let bought = 0;
    if (spend(cost.store)) while (empty().length > have()) {
      const id = [...names].sort((a, b) => count(a) - count(b))[0];
      const price = CROPS[id].seed * bundle;
      if (s.money < price) break;
      s.money -= price; s.seeds[id] = (s.seeds[id] || 0) + bundle; bought += bundle;
    }
    if (bought) notes.push(`씨앗 ${bought}개 삼`);
  }

  // 4. 빈 칸에 가진 씨앗 심기 — 많이 가진 것부터
  for (const p of empty()) {
    const id = [...names].sort((a, b) => (s.seeds[b] || 0) - (s.seeds[a] || 0))[0];
    if (!s.seeds[id] || !spend(cost.plant)) break;
    s.seeds[id]--; p.crop = id; p.grown = 0; planted++;
  }
  const dayEnd = min;
  wifeWork(dayLen - min);   // 일찍 문 열어도 낮 남은 시간은 따지지 않는다: 아내는 저녁까지 손질

  // 저녁: 튜토리얼이면 손질된 만큼, 아니면 손님 수만큼 아무 메뉴. 손질된 게 있으면 다 받는다고 본다
  const plan = day <= TUTORIAL.days
    ? names.flatMap(id => Array(wife.ready[id] || 0).fill(id)).slice(0, CUSTOMERS.perEvening)
    : Array.from({ length: CUSTOMERS.perEvening }, () => names[Math.floor(random() * names.length)]);
  let served = 0, missed = 0, earned = 0;
  for (const id of plan) {
    if (wife.ready[id]) { wife.ready[id]--; served++; earned += CROPS[id].dish; }
    else missed++;
  }
  s.money += earned;
  wifeWork(eveLen);
  const news = TOWN.news.find(n => n.day === day);
  if (news) { s.opened.add(news.opens); notes.push(`${TOWN.shops[news.opens].name} 열림`); }

  out.push({
    날: day, 끝: fmt(dayEnd), 캠: harvested, 심음: planted, '아내 쉰 분': Math.round(wife.idle),
    손님: `${served}/${plan.length}`, 번돈: earned, 돈: s.money, '남은 요리': list(wife.ready),
    씨앗: list(s.seeds), 밭: `${plots.filter(isRipe).length}칸 내일 캠 가능?`.replace(/.*/, () => {
      const next = plots.filter(p => p.crop && p.grown + 1 >= CROPS[p.crop].days).length;
      return `내일 익는 ${next}칸`;
    }), 메모: notes.join(', '),
  });
}
console.table(out);
