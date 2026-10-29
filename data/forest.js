// 숲 (→ docs/기획.md 5 재료 구하는 길). tree · rock = 짓기 재료(가방 안 씀), bush = 먹을 재료(가방에 담김)
// bush는 하루에 한 번 딸 수 있고, 늘 최소 1개는 나온다(갇히지 않게 → docs/기획.md 5 먹을 몫). 전부 임시
const FOREST = {
  bush: { gives: ['greens', 'mushroom'], min: 1, max: 2 },
};
