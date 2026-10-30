// 맛보기 ① 실시간 액션 · 화면 위 글자 · 막대(2D · 3D 같이 씀)
(function () {
  const { W, H, WORLD, WAVES, grow, needExp, stats, weaponColor, telegraphing } = ACT;
  const I = G.input;
  let P, enemies, shots, slashes, boss, phase, waveNo, hitCount, banner, endT;
  const refresh = () => ({ P, enemies, shots, slashes, boss, phase, waveNo, hitCount, banner, endT } = ACT.get());

  function bar(ctx, x, y, w, h, k, color) {
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.round(w * G.clamp(k, 0, 1)), h);
  }

  ACT.drawHud = function (ctx) {
    refresh();
    const st = stats();
    // 왼쪽 위: 체력 · 레벨 · 경험치
    for (let i = 0; i < st.maxHp; i++) {
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(8 + i * 11, 8, 10, 9);
      ctx.fillStyle = i < P.hp ? '#ff5d73' : '#4a3a48';
      ctx.fillRect(9 + i * 11, 9, 8, 7);
    }
    G.text(ctx, `Lv ${grow.lv}`, 8, 21, { size: 10, bold: true, color: '#ffd86b' });
    bar(ctx, 40, 24, 70, 4, grow.exp / needExp(grow.lv), '#ffd86b');
    G.text(ctx, `공격 ${st.atk} · 범위 ${st.reach}`, 8, 34, { size: 8, color: '#d8d0e0' });
    if (st.spin) G.text(ctx, P.spinCd > 0 ? `회전베기 ${P.spinCd.toFixed(1)}` : '회전베기 준비(L)', 8, 45, { size: 8, color: P.spinCd > 0 ? '#9a90a8' : '#9fe8ff' });

    // 오른쪽 위: 회차 · 진행
    G.text(ctx, `${grow.round}회차`, W - 8, 8, { align: 'right', size: 10, bold: true });
    G.text(ctx, phase === 'waves' ? `무리 ${waveNo}/${WAVES.length}` : '큰 녀석', W - 8, 21, { align: 'right', size: 8, color: '#d8d0e0' });
    if (grow.best != null) G.text(ctx, `최소 맞음 ${grow.best}`, W - 8, 32, { align: 'right', size: 8, color: '#d8d0e0' });

    // 보스 체력 · 맞은 횟수
    if (boss && phase !== 'waves') {
      bar(ctx, W / 2 - 100, H - 16, 200, 6, boss.hp / boss.maxHp, '#ff4f6d');
      G.text(ctx, `맞은 횟수 ${hitCount}`, W / 2, H - 30, { align: 'center', size: 9, color: hitCount ? '#ffb0b0' : '#b8ffb0' });
    }

    if (banner && banner.t < 2) {
      const a = banner.t < 0.2 ? banner.t / 0.2 : banner.t > 1.6 ? (2 - banner.t) / 0.4 : 1;
      G.text(ctx, banner.a, W / 2, 70, { align: 'center', size: 20, bold: true, alpha: a, color: '#ffe9a8' });
      if (banner.b) G.text(ctx, banner.b, W / 2, 96, { align: 'center', size: 10, alpha: a });
    }

    if (phase === 'clear' || phase === 'dead') {
      ctx.fillStyle = 'rgba(20,14,28,0.6)';
      ctx.fillRect(0, 0, W, H);
      if (phase === 'clear') {
        G.text(ctx, hitCount === 0 ? '노히트 클리어!' : '클리어!', W / 2, 80, { align: 'center', size: 22, bold: true, color: '#ffd86b' });
        G.text(ctx, `맞은 횟수 ${hitCount}   ·   레벨 ${grow.lv}`, W / 2, 112, { align: 'center', size: 11 });
        G.text(ctx, '다음 회차는 레벨 그대로, 적도 그대로', W / 2, 132, { align: 'center', size: 9, color: '#d8d0e0' });
      } else {
        G.text(ctx, '쓰러졌다', W / 2, 80, { align: 'center', size: 22, bold: true, color: '#ff8a9a' });
        G.text(ctx, `레벨 ${grow.lv}은 남는다. 다시 해 보자`, W / 2, 112, { align: 'center', size: 11 });
      }
      if (endT > 1) G.text(ctx, I.touchUsed ? '눌러서 계속' : '누르거나 Enter', W / 2, 170, { align: 'center', size: 10, alpha: 0.6 + 0.4 * Math.sin(G.time * 5) });
    }
  }

})();
