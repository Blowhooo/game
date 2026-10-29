// 땅 종류. 지금은 임시 색 네모 (→ docs/기획.md 8)
// give = 누르면 아내에게 건넨다, seat = 손님이 앉는 자리
// gate = 그 소식을 들으면 열리는 문(열리면 openColor), shop = 누르면 그 가게에 들어간다(door = 서서 사는 자리)
const TILES = {
  // 낮 · 바깥
  '.': { name: '잔디',   color: '#7cc35a', solid: false },
  'S': { name: '밭',     color: '#9b6b43', solid: false, plot: true },
  'B': { name: '식당',   color: '#b5835a', solid: true },
  'D': { name: '문',     color: '#5a3a22', solid: true },
  'T': { name: '작업대', color: '#d9b27a', solid: true, give: true },
  // 낮 · 동네
  '=': { name: '길',     color: '#c9b48a', solid: false },
  '|': { name: '울타리', color: '#5e4630', solid: true },
  'X': { name: '닫힌 문', color: '#8a3a2a', solid: true, gate: 'general', openColor: '#c9b48a' },
  'Y': { name: '닫힌 문', color: '#8a3a2a', solid: true, gate: 'smith',   openColor: '#c9b48a' },
  'G': { name: '잡화점', color: '#a8b06a', solid: true, shop: 'general' },
  'g': { name: '잡화점 문', color: '#5a6030', solid: true, shop: 'general', door: true },
  'M': { name: '대장간', color: '#8a8a96', solid: true, shop: 'smith' },
  'm': { name: '대장간 문', color: '#45454e', solid: true, shop: 'smith', door: true },
  // 저녁 · 가게 안
  '_': { name: '마루',   color: '#c9a77c', solid: false },
  'W': { name: '벽',     color: '#6b4a33', solid: true },
  'd': { name: '문',     color: '#3e2a1c', solid: true },
  'K': { name: '부엌',   color: '#8a6a4a', solid: true },
  't': { name: '탁자',   color: '#7a5434', solid: true },
  'c': { name: '자리',   color: '#b89466', solid: false, seat: true },
};
