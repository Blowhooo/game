// 모든 경우의 수: 빈 밭에서 시작해 「작물마다 몇 칸」 조합을 전부 돌려 본다 (→ docs/밸런스.md 4)
// 걷기에 시간이 안 들어서 칸 위치는 상관없고 칸 수만 중요하다. 쓰는 법: node tools/combos.js [며칠=12]
// 전제: 1일째 빈 밭에 다 심고, 캐면 같은 작물을 다시 심는다. 씨앗은 늘 있다(값은 이익에서 뺀다).
//       손님 메뉴는 작물마다 고르게(손님 수 ÷ 작물 수). 시간이 모자라면 못 캔 것 · 못 심은 것은 다음 날로
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {};
vm.createContext(ctx);
for (const f of ['config', 'tiles', 'map', 'crops', 'customers', 'day'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', f + '.js'), 'utf8').replace(/^const /gm, 'var '), ctx);
const { CONFIG, SCENES, TILES, CROPS, CUSTOMERS, DAY } = ctx;

const days = Number(process.argv[2] || 12);
const names = Object.keys(CROPS);
const cost = DAY.day.cost, dayLen = (DAY.day.to - DAY.day.from) * 60;
const total = SCENES.farm.join('').split('').filter(c => TILES[c]?.plot).length;
const demand = CUSTOMERS.perEvening / names.length;
const fmt = min => { const h = DAY.day.from + min / 60; return `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; };

function run(counts) {
  const plots = names.flatMap((id, i) => Array(counts[i]).fill(0).map(() => ({ crop: id, grown: 0, planted: false })));
  const stock = {}, queue = [];
  let cur = null;
  const work = min => {
    while (min > 0) {
      if (!cur && queue.length) cur = { crop: queue.shift(), t: 0 };
      if (!cur) return;
      const need = CROPS[cur.crop].prep * CONFIG.prepMul - cur.t;
      if (min < need) { cur.t += min; return; }
      min -= need; stock[cur.crop] = (stock[cur.crop] || 0) + 1; cur = null;
    }
  };
  const log = [];
  for (let day = 1; day <= days; day++) {
    if (day > 1) for (const p of plots) if (p.planted && p.grown < CROPS[p.crop].days) p.grown++;
    let min = 0, harvested = 0, planted = 0, seedCost = 0, bag = [];
    const spend = m => { if (min + m > dayLen) return false; min += m; work(m); return true; };
    const give = () => { if (bag.length && spend(cost.give)) { queue.push(...bag); bag = []; } };
    for (const p of plots.filter(p => p.planted && p.grown >= CROPS[p.crop].days)) {
      if (bag.length >= CONFIG.bagSize) give();
      if (bag.length >= CONFIG.bagSize || !spend(cost.harvest)) break;
      bag.push(p.crop); p.planted = false; harvested++;
    }
    give();
    for (const p of plots.filter(p => !p.planted)) {
      if (!spend(cost.plant)) break;
      p.planted = true; p.grown = 0; planted++; seedCost += CROPS[p.crop].seed;
    }
    const end = min;
    work(dayLen - min);
    let served = 0, earned = 0;
    for (const id of names) {
      const n = Math.min(stock[id] || 0, demand);
      stock[id] = (stock[id] || 0) - n; served += n; earned += n * CROPS[id].dish;
    }
    work((DAY.evening.to - DAY.evening.from) * 60);
    log.push({ end, harvested, planted, served, profit: earned - seedCost, over: end >= dayLen });
  }
  return log;
}

// 1일째(다 심는 날)는 빼고 2일째부터 평균
const results = [];
for (let a = 0; a <= total; a++) for (let b = 0; a + b <= total; b++) for (let c = 0; a + b + c <= total; c++) {
  const counts = [a, b, c], log = run(counts).slice(1);
  const avg = k => log.reduce((s, d) => s + d[k], 0) / log.length;
  results.push({
    counts, label: names.map((id, i) => `${CROPS[id].name}${counts[i]}`).join(' '),
    endAvg: avg('end'), endMin: Math.min(...log.map(d => d.end)), endMax: Math.max(...log.map(d => d.end)),
    emptyDays: log.filter(d => !d.harvested).length, overDays: log.filter(d => d.over).length,
    served: avg('served'), profit: avg('profit'),
  });
}

const row = r => ({ 조합: r.label, '평균 끝': fmt(r.endAvg), '가장 이른': fmt(r.endMin), '가장 늦은': fmt(r.endMax),
  '빈 날': r.emptyDays, '시간 모자란 날': r.overDays, '손님/일': r.served.toFixed(1), '이익/일': r.profit.toFixed(0) });
console.log(`\n밭 ${total}칸 · 조합 ${results.length}가지 · ${days}일 (2일째부터 평균) · 손님 ${CUSTOMERS.perEvening}명(작물마다 ${demand})`);

console.log('\n[한 가지만 심거나 고르게 심으면]');
const pick = cs => results.find(r => r.counts.join() === cs.join());
const even = Math.floor(total / names.length);
console.table([...names.map((_, i) => names.map((__, j) => i === j ? total : 0)), names.map(() => even)].map(pick).filter(Boolean).map(row));

const good = results.filter(r => !r.emptyDays && !r.overDays && r.endAvg >= 6 * 60 && r.endAvg <= 7 * 60);
console.log(`\n[원칙에 맞는 조합] 빈 날 없음 · 시간 모자란 날 없음 · 평균 오후 2~3시에 끝남: ${good.length}가지 — 이익 높은 순 10개`);
console.table(good.sort((x, y) => y.profit - x.profit).slice(0, 10).map(row));

console.log('\n[이익이 가장 높은 조합 10개] (원칙과 상관없이)');
console.table([...results].sort((x, y) => y.profit - x.profit).slice(0, 10).map(row));

const full = results.filter(r => r.counts.reduce((s, n) => s + n, 0) === total);
console.log(`\n[밭을 다 채운 조합 ${full.length}가지 중] 끝나는 시각 분포`);
const buckets = {};
for (const r of full) { const h = Math.floor(DAY.day.from + r.endAvg / 60); buckets[h] = (buckets[h] || 0) + 1; }
console.table(Object.fromEntries(Object.entries(buckets).map(([h, n]) => [`${h}시대`, n])));
