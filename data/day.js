// 하루 흐름 (→ docs/기획.md 4). from · to = 게임 속 시각(시). 전부 임시
// 낮은 행동할 때만 시간이 흐른다: cost = 행동마다 게임 속 몇 분. 걷기는 0 — 이동은 행동 시간에 포함
// (give = 작업대 다녀와 건네기, store = 가게 다녀오기)
// 저녁은 실시간: seconds = 실제 몇 초 동안 from → to
const DAY = {
  day:     { from: 8,  to: 15, cost: { harvest: 10, plant: 10, give: 30, store: 60 } },
  evening: { from: 17, to: 21, seconds: 90 },
};
