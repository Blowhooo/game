// 처음 이틀 튜토리얼 (→ docs/기획.md 5). 다 자란 줄은 오래 걸리는 작물 위주
const TUTORIAL = {
  days: 2,
  start: { money: 0, seeds: { carrot: 4, potato: 4 } },   // 처음 가진 것 — 잡화점이 열리는 둘째 날까지 버틸 만큼
  // 첫날 아침 밭. row = 위에서 몇 번째 줄(0부터), cols = 그 줄의 몇 번째 칸들(0부터)
  // ripe: false = 하루 덜 자람 → 둘째 날 아침에 다 자람. 줄을 꽉 채우지 않고 섞어 둔다
  field: [
    { row: 0, cols: [0, 1, 2], crop: 'cabbage', ripe: true },
    { row: 1, cols: [0, 1],    crop: 'potato',  ripe: true },
    { row: 1, cols: [2, 3],    crop: 'carrot',  ripe: true },
    { row: 2, cols: [1, 2],    crop: 'carrot',  ripe: false },
  ],
  // 시험용 시작(주소에 ?test): 이 날 아침, 가게 · 창고를 다 짓고 마을 가게 · 배추 씨앗이 열린 상태 → 바로 A가 온다
  // 첫 시험에서 6일째쯤 이 상태였다. 돈 · 씨앗 · 낸 요리 수는 짐작
  test: { day: 6, money: 150, seeds: { carrot: 4, potato: 4, cabbage: 4 }, served: 8 },
};
