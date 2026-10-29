// 처음 이틀 튜토리얼 (→ docs/기획.md 5). 칸 위치 · 개수는 임시
const TUTORIAL = {
  days: 2,
  // 첫날 아침 밭. ripe: false = 하루 덜 자람 → 둘째 날 아침에 다 자람
  field: [
    { crop: 'potato', ripe: true,  at: [[10, 4], [11, 4], [12, 4]] },
    { crop: 'carrot', ripe: true,  at: [[10, 5], [11, 5]] },
    { crop: 'potato', ripe: false, at: [[13, 4], [14, 4]] },
    { crop: 'carrot', ripe: false, at: [[12, 5], [13, 5]] },
  ],
};
