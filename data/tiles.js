// 땅 종류. 지금은 임시 색 네모 (→ docs/기획.md 8)
// give = 누르면 아내에게 건넨다, seat = 손님이 앉는 자리
const TILES = {
  // 낮 · 바깥
  '.': { name: '잔디',   color: '#7cc35a', solid: false },
  'S': { name: '밭',     color: '#9b6b43', solid: false, plot: true },
  'B': { name: '식당',   color: '#b5835a', solid: true },
  'D': { name: '문',     color: '#5a3a22', solid: true },
  'T': { name: '작업대', color: '#d9b27a', solid: true, give: true },
  // 저녁 · 가게 안
  '_': { name: '마루',   color: '#c9a77c', solid: false },
  'W': { name: '벽',     color: '#6b4a33', solid: true },
  'd': { name: '문',     color: '#3e2a1c', solid: true },
  'K': { name: '부엌',   color: '#8a6a4a', solid: true },
  't': { name: '탁자',   color: '#7a5434', solid: true },
  'c': { name: '자리',   color: '#b89466', solid: false, seat: true },
};
