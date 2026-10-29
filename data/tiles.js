// 땅 종류. 지금은 임시 색 네모 (→ docs/기획.md 8). 숲에서 딸 것은 바닥색 위에 임시 모양(src/render.js gatherIcon)
// give = 누르면 아내에게 건넨다, seat = 들른 손님이 서서 먹는 자리, gather = 숲에서 딸 것(→ data/forest.js)
// build = 지을 터(→ data/build.js), gate = 그 소식을 들으면 열리는 문(열리면 openColor)
// shop = 누르면 그 가게에 들어간다(door = 서서 사는 자리)
const TILES = {
  '.': { name: '잔디',   color: '#7cc35a', solid: false },
  'S': { name: '밭',     color: '#9b6b43', solid: false, plot: true },
  'H': { name: '집',     color: '#8a6a52', solid: true },
  'T': { name: '작업대', color: '#d9b27a', solid: true, give: true },
  'c': { name: '자리',   color: '#a8c88a', solid: false, seat: true },
  'Q': { name: '가게 터', color: '#b8a07a', solid: true, build: 'shop' },
  'q': { name: '창고 터', color: '#b8a07a', solid: true, build: 'storage' },
  // 숲
  ',': { name: '숲 바닥', color: '#4e8a3e', solid: false },
  'R': { name: '나무',   color: '#4e8a3e', solid: true, gather: 'wood' },
  'O': { name: '바위',   color: '#4e8a3e', solid: true, gather: 'stone' },
  '*': { name: '덤불',   color: '#4e8a3e', solid: true, gather: 'bush' },
  // 길 · 마을
  '=': { name: '길',     color: '#c9b48a', solid: false },
  '|': { name: '울타리', color: '#5e4630', solid: true },
  'X': { name: '닫힌 문', color: '#8a3a2a', solid: true, gate: 'general', openColor: '#c9b48a' },
  'Y': { name: '닫힌 문', color: '#8a3a2a', solid: true, gate: 'smith',   openColor: '#c9b48a' },
  'G': { name: '잡화점', color: '#a8b06a', solid: true, shop: 'general' },
  'g': { name: '잡화점 문', color: '#5a6030', solid: true, shop: 'general', door: true },
  'M': { name: '대장간', color: '#8a8a96', solid: true, shop: 'smith' },
  'm': { name: '대장간 문', color: '#45454e', solid: true, shop: 'smith', door: true },
};
