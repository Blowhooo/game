// 하루 흐름 (→ docs/기획.md 4). from · to = 게임 속 시각(시). 전부 임시
// 낮은 행동할 때만 시간이 흐른다: cost = 행동마다 게임 속 몇 분
// 저녁은 실시간: seconds = 실제 몇 초 동안 from → to
const DAY = {
  day:     { from: 8,  to: 15, cost: { walk: 3, harvest: 10, plant: 10, give: 10 } },   // walk = 한 칸 걸을 때
  evening: { from: 17, to: 21, seconds: 90 },
};
