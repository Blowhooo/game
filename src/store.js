// 마을 가게 화면: 종묘상 = 씨앗 묶음, 대장간 = 도구 (→ data/town.js). 다녀오는 데 낮 시간이 든다(data/day.js cost.store)
const Store = {
  el: null,
  init() {
    this.el = document.getElementById('store');
    document.getElementById('storeClose').onclick = () => this.close();
  },
  isOpen() { return this.el.classList.contains('on'); },
  close() { this.el.classList.remove('on'); },

  open(id) {
    this.id = id;
    this.render();
    this.el.classList.add('on');
  },

  render() {
    const shop = TOWN.shops[this.id], list = document.getElementById('storeList');
    document.getElementById('storeTitle').textContent = `${shop.name} · 가진 돈 ${state.money}`;
    list.innerHTML = '';
    const item = (label, price, can, buy) => {
      const b = document.createElement('button');
      b.innerHTML = `${label}<br><small>${price}</small>`;
      b.disabled = !can;
      b.onclick = () => { buy(); this.render(); };
      list.append(b);
    };
    if (shop.seeds) for (const [id, c] of Object.entries(CROPS)) {
      if (c.wild || (c.locked && !state.crops.has(id))) continue;
      const price = c.seed * shop.seeds;
      item(`${c.name} 씨앗 ${shop.seeds}개 (가진 것 ${Farm.seeds[id] || 0})`, price, state.money >= price, () => {
        state.money -= price;
        Farm.seeds[id] = (Farm.seeds[id] || 0) + shop.seeds;
      });
    }
    for (const id of shop.tools || []) {
      const t = TOOLS[id], owned = state.tools.has(id);
      item(`${t.name} — ${t.desc}`, owned ? '샀음' : t.price, !owned && state.money >= t.price, () => {
        state.money -= t.price;
        state.tools.add(id);
        Object.assign(CONFIG, t.effect);
      });
    }
  },
};
