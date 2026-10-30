// 지을 것 (→ docs/기획.md 5 짓고 고치기). 날짜가 아니라 들인 만큼: work = 짓기 몇 번, wood · stone = 드는 재료
// 짓기 한 번마다 그만큼의 재료를 쓴다(모자라면 그 번은 못 함). 전부 임시
// after = 이걸 다 지은 뒤에야 터가 나타난다. baby = 아기 맞을 준비(→ docs/기획.md 3) — 못 지어도 손해 없고, 출산 뒤에도 지을 수 있다
const BUILDINGS = {
  shop:    { name: '가게', work: 8, wood: 6, stone: 3, color: '#b5835a',
             desc: '아내의 하루 장사 한도가 늘어남', effect: { energy: 4 } },
  storage: { name: '창고', work: 4, wood: 4, stone: 2, color: '#8a6a4a',
             desc: '다 못 판 재료가 다음 날까지 남음', effect: { keep: true } },
  cradle:  { name: '요람', work: 2, wood: 2, stone: 0, color: '#c8a070', after: 'shop', baby: true,
             desc: '아기가 태어나면 잘 자서 아내 기력 +1', effect: { babyEnergy: 1 } },
  nursery: { name: '아기방', work: 6, wood: 6, stone: 4, color: '#9a7a5e', after: 'shop', baby: true,
             desc: '출산 뒤 아내가 쉬는 날이 하루 줄어듦', effect: { restLess: 1 } },
  washing: { name: '빨래터', work: 3, wood: 2, stone: 3, color: '#7a9ab0', after: 'shop', baby: true,
             desc: '새참 효과가 커짐(아내 손이 덜 바빠짐)', effect: { snack: 0.1 } },
};
