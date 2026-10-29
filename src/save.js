// 저장: 아침마다 그날 시작 상태를 브라우저에 남긴다. 다시 열면 그날 아침부터 (→ docs/기획.md 8)
// 브라우저 저장소가 막혀 있어도 게임은 그대로 돌아가게 전부 try/catch
const Save = {
  key: 'gilga-save-2',

  write() {
    const data = {
      state: { ...state, tools: [...state.tools], crops: [...state.crops] },
      farm: { plots: Farm.plots, seeds: Farm.seeds, bag: Farm.bag },
      forest: { wood: Forest.wood, stone: Forest.stone },
      build: Build.progress,
      wife: { queue: Wife.queue, current: Wife.current, ready: Wife.ready },
      served: Cooking.served,
      opened: [...World.opened],
    };
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) {}
  },

  // 저장된 게 있으면 불러오고 true
  read() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(this.key)); } catch (e) {}
    if (!data) return false;
    Object.assign(state, data.state, { tools: new Set(data.state.tools), crops: new Set(data.state.crops) });
    for (const id of state.tools) Object.assign(CONFIG, TOOLS[id].effect);
    Object.assign(Farm.plots, data.farm.plots);
    Object.assign(Farm.seeds, data.farm.seeds);
    Object.assign(Farm.bag, data.farm.bag);
    Object.assign(Forest, data.forest);
    Object.assign(Build.progress, data.build);
    Object.assign(Wife, data.wife);
    Cooking.served = data.served;
    data.opened.forEach(g => World.opened.add(g));
    return true;
  },

  clear() { try { localStorage.removeItem(this.key); } catch (e) {} },
};
