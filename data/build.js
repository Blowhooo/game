// 지을 것 (→ docs/기획.md 5 짓고 고치기). 날짜가 아니라 들인 만큼: work = 짓기 몇 번, wood · stone = 드는 재료
// 짓기 한 번마다 그만큼의 재료를 쓴다(모자라면 그 번은 못 함). 전부 임시
const BUILDINGS = {
  shop:    { name: '가게', work: 8, wood: 6, stone: 3, color: '#b5835a',
             desc: '아내의 하루 장사 한도가 늘어남', effect: { energy: 4 } },
  storage: { name: '창고', work: 4, wood: 4, stone: 2, color: '#8a6a4a',
             desc: '다 못 판 재료가 다음 날까지 남음', effect: { keep: true } },
};
