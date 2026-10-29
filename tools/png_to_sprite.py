"""PixelLab PNG → 우리 글자 데이터(32x32).
줄이기(칸마다 가장 많은 색) → Resurrect 64에서 가장 가까운 색 → 외곽선 규칙대로 다시 긋기(오른쪽 · 아래 #2e222f, 왼쪽 · 위는 그 색을 어둡게).
python tools/png_to_sprite.py 입력.png [키(픽셀), 기본 27]  → {"palette": {...}, "rows": [...]} JSON 출력"""
import json, sys
from collections import Counter
from PIL import Image

R64 = ('2e222f 3e3546 625565 966c6c ab947a 694f62 7f708a 9babb2 c7dcd0 ffffff 6e2727 b33831 ea4f36 f57d4a ae2334 e83b3b '
       'fb6b1d f79617 f9c22b 7a3045 9e4539 cd683d e6904e fbb954 4c3e24 676633 a2a947 d5e04b fbff86 165a4c 239063 1ebc73 '
       '91db69 cddf6c 313638 374e4a 547e64 92a984 b2ba90 0b5e65 0b8a8f 0eaf9b 30e1b9 8ff8e2 323353 484a77 4d65b4 4d9be6 '
       '8fd3ff 45293f 6b3e75 905ea9 a884f3 eaaded 753c54 a24b6f cf657f ed8099 831c5d c32454 f04f78 f68181 fca790 fdcbb0').split()
PAL = [tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) for h in R64]
INK = PAL[0]  # #2e222f, 순수 검정 대신

def dist(a, p):  # 사람 눈에 가깝게 가중치
    rm = (a[0] + p[0]) / 2
    return (2 + rm / 256) * (a[0] - p[0])**2 + 4 * (a[1] - p[1])**2 + (2 + (255 - rm) / 256) * (a[2] - p[2])**2
nearest = lambda c: min(PAL, key=lambda p: dist(c, p))
nearest_fill = lambda c: min(PAL[1:], key=lambda p: dist(c, p))  # 안쪽 색: #2e222f는 선 전용이라 뺌

def convert(path, height=27, foot_y=28, center_x=16, dark=0.45, size=32, box=None):
    """box: 애니메이션 프레임처럼 여러 장을 같은 자리에 맞출 때 쓰는 공통 영역(모든 프레임을 합친 bbox). 주면 height는 무시하고 1:1로 옮김"""
    im = Image.open(path).convert('RGBA')
    x0, y0, x1, y1 = box or im.getbbox()
    if box: height = y1 - y0
    f = (y1 - y0) / height                      # 원본 몇 픽셀 = 우리 1픽셀
    tw = round((x1 - x0) / f)
    src = im.load()
    cache = {}
    def q(p):
        if p[3] < 128: return None
        if p[:3] not in cache: cache[p[:3]] = INK if sum(p[:3]) < 30 else nearest_fill(p[:3])  # 거의 검정만 선으로
        return cache[p[:3]]
    grid = [[None] * size for _ in range(size)]
    ox, oy = center_x - tw // 2, foot_y + 1 - height
    for ty in range(height):
        for tx in range(tw):
            cnt = Counter()
            for y in range(int(y0 + ty * f), min(y1, int(y0 + (ty + 1) * f + 0.999))):
                for x in range(int(x0 + tx * f), min(x1, int(x0 + (tx + 1) * f + 0.999))):
                    cnt[q(src[x, y])] += 1
            if cnt[None] > sum(cnt.values()) / 2: continue
            del cnt[None]
            # 안쪽 선(눈 · 모자챙 아래 등)은 칸의 45% 이상이 어두우면 살림. 바깥 외곽선은 나중에 다시 그음
            total = sum(cnt.values())
            inner = Counter({k: v for k, v in cnt.items() if k != INK})
            pick = INK if cnt[INK] >= total * dark or not inner else inner.most_common(1)[0][0]
            gx, gy = ox + tx, oy + ty
            if 0 <= gx < size and 0 <= gy < size: grid[gy][gx] = pick
    solid = lambda x, y: 0 <= x < size and 0 <= y < size and grid[y][x] is not None
    out = [r[:] for r in grid]
    for y in range(size):
        for x in range(size):
            c = grid[y][x]
            if c is None: continue
            if not solid(x + 1, y) or not solid(x, y + 1): out[y][x] = INK
            elif not solid(x - 1, y) or not solid(x, y - 1): out[y][x] = nearest(tuple(int(v * 0.55) for v in c))
    # 쓰인 색에 글자 붙이기
    letters = 'bcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    used = sorted({c for r in out for c in r if c}, key=lambda c: (c != INK, sum(c)))
    ch = {c: letters[i] for i, c in enumerate(used)}
    return {'palette': {ch[c]: '#%02x%02x%02x' % c for c in used},
            'rows': [''.join(ch[c] if c else '.' for c in r) for r in out]}

if __name__ == '__main__':
    print(json.dumps(convert(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 27)))
