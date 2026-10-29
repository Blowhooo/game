// 밸런스 점검: data/*.js를 읽어 docs/밸런스.md 3의 원칙마다 지금 숫자를 계산한다
// 쓰는 법: node tools/balance.js
const fs = require('fs'), path = require('path'), vm = require('vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['config', 'tiles', 'map', 'crops', 'tutorial', 'customers', 'day', 'town'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', f + '.js'), 'utf8').replace(/^const /gm, 'var '), ctx);
const { CONFIG, CROPS, TUTORIAL, CUSTOMERS, DAY, TOWN, TOOLS } = ctx;

const ok = (good, text) => console.log(`${good ? '✓' : '⚠'} ${text}`);
const names = Object.keys(CROPS);
const avg = f => names.reduce((a, id) => a + f(CROPS[id]), 0) / names.length;
const time = min => { const h = 8 + min / 60; return `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; };

const cost = DAY.day.cost;

console.log('\n[작물끼리 공평하게] 칸 하나가 하루에 버는 돈 = (요리값 − 씨앗값) ÷ 자라는 기간');
const perDay = names.map(id => { const c = CROPS[id]; return [c.name, (c.dish - c.seed) / c.days]; });
for (const [n, v] of perDay) console.log(`   ${n} ${v.toFixed(1)}`);
const lo = Math.min(...perDay.map(p => p[1])), hi = Math.max(...perDay.map(p => p[1]));
ok(hi / lo <= 1.2, `가장 큰 것이 가장 작은 것의 ${(hi / lo).toFixed(2)}배 (기준 1.2배 안, 추측)`);

console.log('\n[초반 하루가 꽉 찬다] 첫날 할 일을 다 하면 몇 시?');
const ripe = TUTORIAL.field.filter(f => f.ripe).reduce((a, f) => a + f.cols.length, 0);
const seeds = Object.values(TUTORIAL.start.seeds).reduce((a, n) => a + n, 0);
const trips = Math.ceil(ripe / CONFIG.bagSize);
const dayMin = ripe * cost.harvest + seeds * cost.plant + trips * cost.give;
console.log(`   캐기 ${ripe}칸 · 심기 ${seeds}칸 · 작업대 왕복 ${trips}번`);
ok(dayMin >= 6 * 60 && dayMin <= 7 * 60, `약 ${time(dayMin)}에 끝남 (기준 오후 2~3시)`);

console.log('\n[핵심 리듬] 한 번 나르는 시간 ≈ 가방만큼 손질하는 시간');
const trip = CONFIG.bagSize * cost.harvest + cost.give;
const prep = CONFIG.bagSize * avg(c => c.prep) * CONFIG.prepMul;
ok(Math.abs(trip - prep) / Math.max(trip, prep) <= 0.3, `나르기 약 ${Math.round(trip)}분 · 손질 약 ${Math.round(prep)}분 (차이 30% 안, 추측)`);

console.log('\n[튜토리얼 동안 고리를 한 바퀴] 모든 작물을 캐 보고 심어 볼 수 있나');
for (const id of names) {
  const harvest = TUTORIAL.field.some(f => f.crop === id && f.cols.length);
  const plant = (TUTORIAL.start.seeds[id] || 0) > 0;
  ok(harvest && plant, `${CROPS[id].name}: 캐 보기 ${harvest ? 'O' : 'X'} · 처음 씨앗 ${plant ? 'O' : 'X'}`);
}

console.log('\n[며칠 장사하면 하나] 도구 값 ÷ 하루 벌이');
const income = CUSTOMERS.perEvening * avg(c => c.dish);
console.log(`   하루 벌이 어림: 손님 ${CUSTOMERS.perEvening}명 × 요리 평균 ${avg(c => c.dish).toFixed(1)} = ${income.toFixed(0)}`);
for (const t of Object.values(TOOLS)) ok(t.price / income >= 2 && t.price / income <= 3, `${t.name} ${t.price} = ${(t.price / income).toFixed(1)}일치 (기준 2~3일, 추측)`);

console.log('\n[초반엔 빈 날 없음] 가장 짧은 작물');
const shortest = Math.min(...names.map(id => CROPS[id].days));
ok(shortest === 1, `가장 짧은 작물 ${shortest}일 (기준 1일)`);

console.log('\n[하루 장사량 한계] 하루 손님 수 ≈ 하루 손질할 수 있는 양');
const dayPrep = (DAY.day.to - DAY.day.from) * 60 / (avg(c => c.prep) * CONFIG.prepMul);
ok(Math.abs(CUSTOMERS.perEvening - dayPrep) / Math.max(CUSTOMERS.perEvening, dayPrep) <= 0.3,
  `손님 ${CUSTOMERS.perEvening}명 · 낮 동안 손질 최대 약 ${dayPrep.toFixed(0)}개 (차이 30% 안, 추측)`);
console.log('');
