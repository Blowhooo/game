// 3D용 픽셀 질감을 코드로 그린다(16×16, 그림 파일 · 돈 없이). 나무판 · 통나무 · 돌 · 지붕 · 짚 · 흙 · 창 · 문 · 물 · 잎 · 풀.
//   G.tex3d.mat('plank', { repeat: [2, 1], color: 0xffffff })  → 같은 조건이면 같은 재질을 돌려준다
//   G.tex3d.tex('plank')                                       → 질감만
(function () {
  const T = (G.tex3d = {});
  const S = 16;

  function rng(seed) {
    let s = seed;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  }
  const hex = (c, k) => {
    // 색을 k만큼 밝게(+) / 어둡게(-)
    const n = parseInt(c.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + k * 255)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  const DRAW = {
    plank(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#b98b5a', (r() - 0.5) * 0.06));
      for (let y = 3; y < S; y += 4) for (let i = 0; i < S; i++) px(x, i, y, '#7a5332');
      for (let k = 0; k < 4; k++) px(x, (k * 7 + 3) % S, k * 4 + 1, '#8f6540'); // 못 자국 · 옹이
    },
    log(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#8a5f3a', (r() - 0.5) * 0.08));
      for (let y = 0; y < S; y += 5) for (let i = 0; i < S; i++) px(x, i, y, '#5e3e24');
      for (let y = 1; y < S; y += 5) for (let i = 0; i < S; i++) if (r() < 0.5) px(x, i, y, '#a87a50');
    },
    stone(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#8d9096', (r() - 0.5) * 0.08));
      for (let y = 0; y < S; y += 4) {
        for (let i = 0; i < S; i++) px(x, i, y, '#5f6268');
        const off = (y / 4) % 2 ? 4 : 0;
        for (let i = off; i < S; i += 8) for (let k = 0; k < 4; k++) px(x, i, y + k, '#5f6268');
      }
    },
    roof(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#9a4a36', (r() - 0.5) * 0.06));
      for (let y = 0; y < S; y += 4) {
        for (let i = 0; i < S; i++) px(x, i, y + 3, '#6a2e22');
        for (let i = (y / 4) % 2 ? 2 : 6; i < S; i += 8) for (let k = 0; k < 4; k++) px(x, i, y + k, '#6a2e22');
        for (let i = 0; i < S; i++) if (r() < 0.3) px(x, i, y, '#b8624a');
      }
    },
    roofBlue(x, r) {
      DRAW.roof(x, r);
      recolor(x, (c) => [c[2] * 0.7, c[1] * 0.9 + 20, c[0] * 0.9 + 30]);
    },
    thatch(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#c7a24e', (r() - 0.5) * 0.12));
      for (let i = 0; i < 26; i++) {
        const a = Math.floor(r() * S),
          b = Math.floor(r() * S);
        px(x, a, b, '#8f7030');
        px(x, a, (b + 1) % S, '#8f7030');
      }
    },
    dirt(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#8a6a48', (r() - 0.5) * 0.1));
    },
    window(x) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, '#6a4a2c');
      for (let y = 2; y < 14; y++) for (let i = 2; i < 14; i++) px(x, i, y, y < 6 ? '#cfeaf5' : '#8ec3dc');
      for (let i = 2; i < 14; i++) {
        px(x, i, 7, '#6a4a2c');
        px(x, 7, i, '#6a4a2c');
      }
    },
    door(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#6e4528', (r() - 0.5) * 0.05));
      for (let i = 0; i < S; i += 4) for (let y = 0; y < S; y++) px(x, i, y, '#4e2f18');
      px(x, 12, 9, '#e0c060');
    },
    water(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#4a8fc0', (r() - 0.5) * 0.08));
      for (let i = 0; i < 6; i++) px(x, Math.floor(r() * S), Math.floor(r() * S), '#bfe3f5');
    },
    leaf(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#4f8a3a', (r() - 0.5) * 0.16));
      for (let i = 0; i < 20; i++) px(x, Math.floor(r() * S), Math.floor(r() * S), '#7fb85a');
    },
    grass(x, r) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, hex('#7fb04a', (r() - 0.5) * 0.08));
    },
    flower(x, r) {
      DRAW.leaf(x, r);
      for (let i = 0; i < 10; i++) px(x, Math.floor(r() * S), Math.floor(r() * S), r() < 0.5 ? '#ff8fb0' : '#ffe070');
    },
    white(x) {
      for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) px(x, i, y, '#ffffff');
    },
  };

  function px(x, i, y, c) {
    x.fillStyle = c;
    x.fillRect(i, y, 1, 1);
  }
  function recolor(x, f) {
    const d = x.getImageData(0, 0, S, S);
    for (let i = 0; i < d.data.length; i += 4) {
      const [r, g, b] = f([d.data[i], d.data[i + 1], d.data[i + 2]]);
      d.data[i] = r;
      d.data[i + 1] = g;
      d.data[i + 2] = b;
    }
    x.putImageData(d, 0, 0);
  }

  const texCache = {};
  T.tex = function (name) {
    if (!texCache[name]) {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      DRAW[name](x, rng(name.length * 977 + 13));
      const t = new THREE.CanvasTexture(c);
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      texCache[name] = t;
    }
    return texCache[name];
  };

  const matCache = {};
  T.mat = function (name, o = {}) {
    const rep = o.repeat || [1, 1];
    const key = [name, rep, o.color, o.emissive, o.transparent, o.opacity].join('|');
    if (!matCache[key]) {
      let t = T.tex(name);
      if (rep[0] !== 1 || rep[1] !== 1) {
        t = t.clone();
        t.repeat.set(rep[0], rep[1]);
        t.needsUpdate = true;
      }
      matCache[key] = new THREE.MeshLambertMaterial({ map: t, color: o.color ?? 0xffffff, emissive: o.emissive ?? 0x000000, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
    }
    return matCache[key];
  };
})();
