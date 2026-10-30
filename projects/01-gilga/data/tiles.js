// 땅 종류. ground = 바닥 그림(sprites/ground.js: grass · soil · path · forest, 없으면 grass)
// color = 바닥 위에 덮는 임시 색 네모(아직 그림 없는 것, → docs/기획.md 8). 숲에서 딸 것은 sprites/forest.js
// give = 누르면 아내에게 건넨다, seat = 들른 손님이 서서 먹는 자리, gather = 숲에서 딸 것(→ data/forest.js)
// build = 지을 터(→ data/build.js), gate = 그 소식을 들으면 열리는 문(열리면 색 네모 없이 openGround)
// shop = 누르면 그 가게에 들어간다(door = 서서 사는 자리)
const TILES = {
  '.': { name: '잔디',   solid: false },                       // 집 · 마을 마당에만
  'S': { name: '밭',     ground: 'soil', solid: false, plot: true },
  'H': { name: '집',     color: '#8a6a52', solid: true },
  'T': { name: '작업대', color: '#d9b27a', solid: true, give: true },
  'c': { name: '자리',   color: '#a8c88a80', solid: false, seat: true },
  'Q': { name: '가게 터', color: '#b8a07a', solid: true, build: 'shop' },
  'q': { name: '창고 터', color: '#b8a07a', solid: true, build: 'storage' },
  'n': { name: '아기방 터', color: '#b8a07a', solid: true, build: 'nursery' },
  'b': { name: '요람 터',   color: '#b8a07a', solid: true, build: 'cradle' },
  'u': { name: '빨래터 터', color: '#b8a07a', solid: true, build: 'washing' },
  // 들 · 숲 (바닥은 둘 다 들풀 = 잔디를 어둡게)
  ',': { name: '들풀',   ground: 'forest', solid: false },
  'R': { name: '나무',   ground: 'forest', solid: true, gather: 'wood' },
  'O': { name: '바위',   ground: 'forest', solid: true, gather: 'stone' },
  '*': { name: '덤불',   ground: 'forest', solid: true, gather: 'bush' },
  // 길 · 마을
  '=': { name: '길',     ground: 'path', solid: false },
  '|': { name: '울타리', color: '#5e4630', solid: true },
  'X': { name: '닫힌 문', color: '#8a3a2a', solid: true, gate: 'general', openGround: 'path' },
  'Y': { name: '닫힌 문', color: '#8a3a2a', solid: true, gate: 'smith',   openGround: 'path' },
  'G': { name: '종묘상', color: '#a8b06a', solid: true, shop: 'general' },
  'g': { name: '종묘상 문', color: '#5a6030', solid: true, shop: 'general', door: true },
  'M': { name: '대장간', color: '#8a8a96', solid: true, shop: 'smith' },
  'm': { name: '대장간 문', color: '#45454e', solid: true, shop: 'smith', door: true },
};
