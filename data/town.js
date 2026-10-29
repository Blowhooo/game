// 동네 가게 (→ docs/기획.md 5). 처음엔 문이 닫혀 있고, 저녁 손님이 알려 준 날 밤부터 열린다. 숫자는 전부 임시
const TOWN = {
  news: [
    { day: 1, opens: 'general', line: '「길 따라가면 잡화점이 있어요. 씨앗도 팔아요.」' },
    { day: 3, opens: 'smith',   line: '「잡화점 지나면 대장간도 있답니다.」' },
  ],
  shops: {
    general: { name: '잡화점', seeds: 4 },   // seeds = 씨앗을 몇 개 묶음으로 파나(한 줄)
    smith:   { name: '대장간', tools: ['basket', 'knife'] },
  },
};

// 도구: effect = 사면 바뀌는 CONFIG 값 (→ data/config.js)
const TOOLS = {
  basket: { name: '바구니', desc: '한 번에 6개 옮김', price: 120, effect: { bagSize: 6 } },
  knife:  { name: '새 칼',  desc: '아내 손질이 빨라짐', price: 120, effect: { prepMul: 0.7 } },
};
