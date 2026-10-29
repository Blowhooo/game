// 처음 이틀 튜토리얼 (→ docs/기획.md 5). 다 자란 줄은 오래 걸리는 작물 위주
const TUTORIAL = {
  days: 2,
  start: { money: 0, seeds: { carrot: 4, potato: 4 } },   // 처음 가진 것 — 잡화점이 열리는 둘째 날까지 버틸 만큼
  // 첫날 아침 밭. row = 위에서 몇 번째 줄(0부터). ripe: false = 하루 덜 자람 → 둘째 날 아침에 다 자람
  field: [
    { row: 0, crop: 'cabbage', ripe: true },
    { row: 1, crop: 'potato',  ripe: true },
    { row: 2, crop: 'carrot',  ripe: false },
    // 넷째 줄은 비워 둔다 — 첫날 무엇을 심을지 고르게
  ],
};
