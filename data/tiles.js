// 땅 종류. 지금은 임시 색 네모 (→ docs/기획.md 8)
const TILES = {
  '.': { name: '잔디',   color: '#7cc35a', solid: false },
  'S': { name: '밭',     color: '#9b6b43', solid: false, plot: true },
  'B': { name: '식당',   color: '#b5835a', solid: true },
  'D': { name: '문',     color: '#5a3a22', solid: true },
  'T': { name: '작업대', color: '#d9b27a', solid: true, give: true },  // give = 누르면 아내에게 건넨다
};
