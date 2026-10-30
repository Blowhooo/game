// 재료. 밭 작물: days = 심고 며칠 뒤 다 자라나, seed = 씨앗 하나 값
// 숲 재료(wild): 심지 않고 숲에서 딴다 (→ data/forest.js)
// prep = 아내가 하나 손질 · 요리하는 데 게임 속 몇 분, dish = 기본 요리 하나 값 (전부 임시 — 오래 걸리는 작물일수록 비싸게)
// locked = 처음엔 씨앗을 안 판다 — 손님 소식으로 열린다 (→ data/town.js)
const CROPS = {
  potato:   { name: '감자', days: 2, prep: 20, seed: 4, dish: 12, color: '#d8b46a' },
  carrot:   { name: '당근', days: 1, prep: 10, seed: 2, dish: 6,  color: '#f0862e' },
  cabbage:  { name: '배추', days: 3, prep: 30, seed: 6, dish: 20, color: '#b6e07a', locked: true },
  greens:   { name: '나물', wild: true, prep: 10, dish: 5, color: '#6fae4a' },
  mushroom: { name: '버섯', wild: true, prep: 15, dish: 8, color: '#c8a08a' },
};
