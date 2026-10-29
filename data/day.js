// 하루 (→ docs/기획.md 4). from · to = 게임 속 시각(시). 전부 임시
// 낮은 행동할 때만 시간이 흐른다: cost = 행동마다 게임 속 몇 분. 걷기는 0 — 이동은 행동 시간에 포함
// give = 아내에게 건네기, store = 마을 가게 다녀오기, wood · stone · forage = 숲, build = 짓기 한 번
// 하루는 남편의 시계로 끝난다(to가 되면 밤)
const DAY = {
  from: 8, to: 15,
  cost: { harvest: 10, plant: 10, give: 20, store: 60, wood: 30, stone: 30, forage: 20, build: 30 },
  food: 2,                                  // 부부가 하루에 먹을 몫 — 채워야 짓기를 할 수 있다 (숫자는 예시)
  snack: { from: 12, mul: 0.8 },            // 새참: 이 시각부터 아내가 준비, 먹으면 그날 남은 행동이 빨라짐(분 × mul)
  rest: { days: 3, mul: 0.85, energy: 1 },  // 쉬는 날 버프: 다음 며칠 동안 행동 분 × mul, 아내 기력 + energy
};
