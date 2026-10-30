// 지을 것(3D). 솜씨(q, 0~1)에 따라 모양이 달라진다:
//   q 낮음 → 판이 삐뚤빼뚤 · 덧댄 자국 · 유리 없는 창 / q 높음 → 반듯 · 창틀 · 굴뚝 · 꽃상자 · 등불
//   const b = G.build.make('house', { q: 0.4, seed: 7 })   → THREE.Group (발밑 가운데가 원점)
//   b.position.set(x, 0, z); G.w3d.scene.add(b)
//   G.build.progress(b, 0.5)   짓는 중(아래부터 반만 보이고 비계가 선다). 1이면 완성
//   G.build.SIZE.house = [가로 칸, 세로 칸] (한 칸 32)
//   손님 주문처럼 모양을 정해 줄 때: make(type, { q, flowers: true, chimney: false, roof: 'roofBlue', windows: 3 })
(function () {
  const B = (G.build = {});
  const TILE = 32;
  B.TILE = TILE;
  B.SIZE = { hut: [2, 2], house: [3, 2], house2: [3, 2], shed: [2, 2], workshop: [2, 2], well: [1, 1], fence: [1, 1], tower: [1, 1] };
  B.NAME = { hut: '오두막', house: '집', house2: '2층집', shed: '창고', workshop: '목공소', well: '우물', fence: '울타리', tower: '망루' };

  const M = (name, w, h, o = {}) => G.tex3d.mat(name, Object.assign({ repeat: [Math.max(1, Math.round(w / 16)), Math.max(1, Math.round(h / 16))] }, o));

  B.make = function (type, o = {}) {
    const q = G.clamp(o.q ?? 0.5, 0, 1);
    let s = (o.seed || 1) * 9301 + 49297;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const j = (a) => (rnd() * 2 - 1) * a * (1 - q); // 솜씨가 낮을수록 크게 어긋남
    const g = new THREE.Group();
    const parts = [];
    const scaffold = new THREE.Group();
    g.add(scaffold);
    g.userData = { parts, scaffold, type, q };

    function box(x, y, z, w, h, d, mat, wobble = 1) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x + j(4) * wobble, y + h / 2 + j(2) * wobble, z + j(4) * wobble);
      m.rotation.set(j(0.13) * wobble, j(0.07) * wobble, j(0.13) * wobble);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      parts.push(m);
      return m;
    }
    function patches(x, y, z, w, h, face) {
      // 덧댄 판(서툰 솜씨의 흔적)
      const n = Math.round((1 - q) * 3 - 0.4);
      for (let i = 0; i < n; i++) {
        const pw = 8 + rnd() * 10,
          ph = 5 + rnd() * 6;
        const px = x + (rnd() - 0.5) * (w - pw),
          py = y + rnd() * (h - ph);
        if (face === 'z') box(px, py, z, pw, ph, 1.5, M('plank', pw, ph, { color: 0x9a7a60 }), 0.6);
        else box(x, py, z + (rnd() - 0.5) * (w - pw), 1.5, ph, pw, M('plank', pw, ph, { color: 0x9a7a60 }), 0.6);
      }
    }
    function gable(cx, y0, d, h, mat) {
      const sh = new THREE.Shape();
      sh.moveTo(-d / 2, 0);
      sh.lineTo(d / 2, 0);
      sh.lineTo(0, h);
      sh.lineTo(-d / 2, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false });
      geo.translate(0, 0, -1.5);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = Math.PI / 2;
      m.position.set(cx, y0, 0);
      m.rotation.z = j(0.05);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      parts.push(m);
    }
    function roof(w, d, topY, tex, angle = 0.62) {
      const hs = d / 2 + 6;
      const L = hs / Math.cos(angle) + 2;
      const rise = hs * Math.tan(angle);
      gable(-w / 2, topY, d, (d / 2) * Math.tan(angle), M(tex === 'thatch' ? 'thatch' : 'plank', d, 20));
      gable(w / 2, topY, d, (d / 2) * Math.tan(angle), M(tex === 'thatch' ? 'thatch' : 'plank', d, 20));
      for (const side of [1, -1]) {
        const m = box(0, 0, 0, w + 12, 3, L, M(tex, w + 12, L));
        m.position.set(j(3), topY - 2 + rise / 2, (side * hs) / 2 + j(2));
        m.rotation.set(side * angle + j(0.06), j(0.03), j(0.05));
      }
      return topY + rise;
    }
    function windowAt(x, y, z, face) {
      const glass = q < 0.25 ? M('dirt', 12, 12, { color: 0x3a2a20 }) : M('window', 16, 16);
      const w = 13,
        h = 13;
      if (face === 'z') box(x, y, z, w, h, 1.5, glass, 0.5);
      else box(x, y, z, 1.5, h, w, glass, 0.5);
      if (q >= 0.5) {
        // 창틀 · 꽃상자
        const frame = M('plank', 16, 4, { color: 0xf0e0c0 });
        if (face === 'z') box(x, y - 2, z + Math.sign(z) * 1.5, w + 4, 2, 3, frame, 0.3);
        else box(x + Math.sign(x) * 1.5, y - 2, z, 3, 2, w + 4, frame, 0.3);
      }
      if (o.flowers ?? q >= 0.8) {
        if (face === 'z') box(x, y - 6, z + Math.sign(z) * 3, w, 4, 4, M('flower', 16, 4), 0.2);
        else box(x + Math.sign(x) * 3, y - 6, z, 4, 4, w, M('flower', 16, 4), 0.2);
      }
    }
    function walls(w, d, y0, h, tex, opt = {}) {
      const t = 4;
      const c = opt.color ?? 0xffffff;
      box(0, y0, d / 2 - t / 2, w, h, t, M(tex, w, h, { color: c }));
      box(0, y0, -d / 2 + t / 2, w, h, t, M(tex, w, h, { color: c }));
      box(-w / 2 + t / 2, y0, 0, t, h, d - t * 2, M(tex, d, h, { color: c }));
      box(w / 2 - t / 2, y0, 0, t, h, d - t * 2, M(tex, d, h, { color: c }));
      if (q < 0.5) {
        patches(0, y0, d / 2 + 0.5, w, h, 'z');
        patches(w / 2 + 0.5, y0, 0, d, h, 'x');
      }
    }
    function post(x, z, y0, h, mat) {
      return box(x, y0, z, 5, h, 5, mat || M('log', 5, h), 0.7);
    }

    let top = 0;
    switch (type) {
      case 'hut': {
        const w = 52,
          d = 46,
          h = 28;
        walls(w, d, 0, h, 'log');
        box(-8, 0, d / 2 + 0.5, 12, 20, 2, M('door', 16, 16), 0.5);
        if ((o.windows ?? (q >= 0.35 ? 1 : 0)) >= 1) windowAt(12, 12, d / 2 + 0.5, 'z');
        if ((o.windows ?? 0) >= 2) windowAt(w / 2 + 0.5, 12, 0, 'x');
        top = roof(w, d, h, o.roof === 'roofBlue' ? 'roofBlue' : 'thatch', 0.7);
        if (o.chimney) box(14, top - 22, -6, 7, 24, 7, M('stone', 7, 24), 0.3);
        break;
      }
      case 'house':
      case 'house2': {
        const w = 82,
          d = 54,
          h = 32;
        box(0, 0, 0, w + 6, 5, d + 6, M('stone', w, 5), 0.3);
        walls(w, d, 5, h, 'plank');
        box(-20, 5, d / 2 + 0.5, 14, 22, 2, M('door', 16, 16), 0.5);
        const nw = o.windows ?? 3;
        if (nw >= 1) windowAt(6, 17, d / 2 + 0.5, 'z');
        if (nw >= 2) windowAt(26, 17, d / 2 + 0.5, 'z');
        if (nw >= 3) windowAt(w / 2 + 0.5, 17, 0, 'x');
        if (nw >= 4) windowAt(-w / 2 - 0.5, 17, 0, 'x');
        top = 5 + h;
        if (type === 'house2') {
          box(0, top, 0, w + 4, 3, d + 4, M('plank', w, d, { color: 0xd0b090 }), 0.4);
          walls(w, d, top + 3, h - 4, 'plank', { color: 0xf4e4cc });
          windowAt(-20, top + 14, d / 2 + 0.5, 'z');
          windowAt(6, top + 14, d / 2 + 0.5, 'z');
          windowAt(26, top + 14, d / 2 + 0.5, 'z');
          if (q >= 0.6) {
            // 발코니
            box(-20, top, d / 2 + 8, 30, 3, 14, M('plank', 30, 14));
            box(-20, top + 3, d / 2 + 14.5, 30, 8, 2, M('plank', 30, 8, { color: 0xf0e0c0 }), 0.4);
          }
          top += h - 1;
        }
        top = roof(w, d, top, o.roof || (type === 'house2' ? 'roofBlue' : 'roof'));
        if (o.chimney ?? q >= 0.7) box(24, top - 26, -8, 9, 30, 9, M('stone', 9, 30), 0.3); // 굴뚝
        break;
      }
      case 'shed': {
        const w = 54,
          d = 50,
          h = 26;
        walls(w, d, 0, h, 'log', { color: 0xd8c0a0 });
        box(0, 0, d / 2 + 0.5, 22, 20, 2, M('door', 22, 20), 0.5);
        const r = box(0, h, 0, w + 10, 3, d + 10, M('plank', w + 10, d + 10, { color: 0xb09070 }));
        r.rotation.x += 0.12;
        top = h + 8;
        break;
      }
      case 'workshop': {
        const w = 56,
          d = 50,
          h = 30;
        for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) post(px, pz, 0, h);
        box(0, 0, -d / 2 + 3, w, h * 0.6, 4, M('plank', w, h * 0.6));
        box(-6, 0, 4, 30, 12, 12, M('plank', 30, 12, { color: 0xc89a6a })); // 작업대
        box(16, 0, 8, 10, 6, 10, M('log', 10, 6)); // 통나무
        top = roof(w, d, h, 'roof', 0.5);
        break;
      }
      case 'well': {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, 10, 10, 1, true), M('stone', 40, 10));
        ring.material = ring.material.clone();
        ring.material.side = THREE.DoubleSide;
        ring.position.y = 5;
        ring.castShadow = ring.receiveShadow = true;
        g.add(ring);
        parts.push(ring);
        const water = new THREE.Mesh(new THREE.CircleGeometry(10, 10), M('water', 16, 16));
        water.rotation.x = -Math.PI / 2;
        water.position.y = 6;
        g.add(water);
        parts.push(water);
        post(-11, 0, 0, 26);
        post(11, 0, 0, 26);
        top = roof(28, 22, 26, 'roof', 0.6);
        break;
      }
      case 'fence': {
        for (const px of [-14, 0, 14]) post(px, 0, 0, 14, M('log', 4, 14));
        box(0, 5, 0, 32, 3, 2, M('plank', 32, 3));
        box(0, 10, 0, 32, 3, 2, M('plank', 32, 3));
        top = 14;
        break;
      }
      case 'tower': {
        const h = 70;
        for (const [px, pz] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) post(px, pz, 0, h);
        box(0, h - 2, 0, 32, 4, 32, M('plank', 32, 32));
        box(0, h + 2, 15, 32, 8, 2, M('plank', 32, 8, { color: 0xd8c0a0 }), 0.5);
        top = roof(30, 30, h + 10, 'roof', 0.7);
        if (q >= 0.9) box(0, h + 4, 0, 4, 6, 4, M('white', 4, 6, { emissive: 0xffc860 }), 0); // 등불
        break;
      }
    }
    g.userData.top = top;

    // 비계(짓는 중에만)
    const [tw, td] = (B.SIZE[type] || [1, 1]).map((n) => n * TILE);
    const pole = M('log', 3, top, { color: 0xc8b090 });
    for (const [px, pz] of [[-tw / 2 + 2, -td / 2 + 2], [tw / 2 - 2, -td / 2 + 2], [-tw / 2 + 2, td / 2 - 2], [tw / 2 - 2, td / 2 - 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, top + 6, 2.5), pole);
      m.position.set(px, (top + 6) / 2, pz);
      m.castShadow = true;
      scaffold.add(m);
    }
    for (let y = 14; y < top; y += 18) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(tw - 2, 2, 3), pole);
      m.position.set(0, y, td / 2 - 2);
      scaffold.add(m);
    }
    scaffold.visible = false;
    return g;
  };

  B.progress = function (g, p) {
    const parts = g.userData.parts;
    const n = Math.floor(parts.length * G.clamp(p, 0, 1) + 1e-6);
    parts.forEach((m, i) => (m.visible = i < n));
    g.userData.scaffold.visible = p > 0 && p < 1;
  };

  // 지을 자리 표시(바닥에 깔리는 네모)
  B.footprint = function (type, color = 0x66ccff) {
    const [tw, td] = (B.SIZE[type] || [1, 1]).map((n) => n * TILE);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tw - 2, td - 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.6;
    return m;
  };
})();
