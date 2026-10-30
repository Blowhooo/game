"""Retro Diffusion 밭 그림(art/retrodiffusion/farm/) → sprites/farm.js 글자 데이터.
색은 Resurrect 64에서 가장 가까운 색으로 맞춤(공통 팔레트). 타일은 외곽선을 다시 긋지 않음.
python tools/make_farm_assets.py

- 타일셋(32px, 4x5칸): 칸마다 네 모서리가 잔디(G)인지 밭(D)인지로 이름을 붙임 → 게임은 '듀얼 그리드'로 그림
  (화면 칸을 반 칸 밀어서, 칸의 네 모서리 = 주변 네 땅의 상태). 16가지 조합이 모두 있음.
- 작물: 가로로 놓인 단계 그림을 32px씩 잘라 단계별로. 데이터(data/crops.js)는 그림 이름만 가리킴.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from png_to_sprite import PAL, dist

SRC = 'art/retrodiffusion/farm'
LETTERS = 'bcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-/:;<=>?@^_~()[]{}|`,' + ''.join(chr(c) for c in range(0xC0, 0x180))  # 색이 많으면 라틴 확장 글자까지

# 타일셋 칸(열, 줄) → 모서리 [왼쪽위, 오른쪽위, 왼쪽아래, 오른쪽아래] (G = 잔디, D = 밭). 그림을 보고 정함
TILESET_CORNERS = {
    (0, 0): 'DDDD', (0, 3): 'GGGG',
    (1, 0): 'DDDG', (2, 0): 'DDGG', (3, 0): 'DDGD',
    (1, 1): 'DGDG', (2, 1): 'GGGG', (3, 1): 'GDGD',
    (1, 2): 'DGDD', (2, 2): 'GGDD', (3, 2): 'GDDD',
    (1, 3): 'GGGD', (2, 3): 'GGDG', (1, 4): 'GDGG', (2, 4): 'DGGG',
    (3, 3): 'DGGD', (3, 4): 'GDDG',
}

# Resurrect 64로 맞추면 잔디가 청록, 흙이 붉게 바뀌어 탁해짐(10/29 확인) → 밭 그림은 원래 색을 그대로 씀
USE_R64 = False
cache = {}
def near(c):
    if not USE_R64: return c
    if c not in cache: cache[c] = min(PAL, key=lambda p: dist(c, p))
    return cache[c]


def to_rows(im):
    px = im.load()
    out = []
    for y in range(im.height):
        row = []
        for x in range(im.width):
            p = px[x, y]
            row.append(None if p[3] < 128 else near(p[:3]))
        out.append(row)
    return out


def main():
    items = {}  # 이름 → 픽셀 줄(색 튜플)
    ts = Image.open(f'{SRC}/tileset_grass_tilled.png').convert('RGBA')
    for (c, r), corners in TILESET_CORNERS.items():
        items[f'soil_{corners}'] = to_rows(ts.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32)))
    items['soil_watered'] = to_rows(Image.open(f'{SRC}/tile_watered_soil.png').convert('RGBA'))
    cs = Image.open(f'{SRC}/carrot_stages.png').convert('RGBA')
    for i in range(4):
        cell = cs.crop((i * 32, 0, i * 32 + 32, 64))
        bb = cell.getbbox()
        cell = cell.crop((0, bb[1], 32, bb[3]))  # 위아래 빈칸 잘라냄(아래쪽이 땅에 닿는 기준)
        items[f'carrot_{i}'] = to_rows(cell)
    cols = sorted({c for rows in items.values() for row in rows for c in row if c})
    assert len(cols) <= len(LETTERS), len(cols)
    L = {c: LETTERS[i] for i, c in enumerate(cols)}
    js = ['// 밭 그림(Retro Diffusion 생성). tools/make_farm_assets.py가 만듦 — 직접 고치지 않음. 원본 art/retrodiffusion/farm/',
          '// soil_XXXX: 네 모서리(왼위 · 오위 · 왼아래 · 오아래)가 G=잔디 / D=밭. 듀얼 그리드로 그림. carrot_0~3: 당근 단계',
          'window.SPRITES = window.SPRITES || {};',
          'const FARM_PALETTE = {\n' + ',\n'.join("  '" + L[c] + "': '#{:02x}{:02x}{:02x}'".format(*c) for c in cols) + ',\n};']
    for name, rows in items.items():
        rs = '\n'.join("    '" + ''.join(L[c] if c else '.' for c in row) + "'," for row in rows)
        js.append(f'SPRITES.{name} = {{\n  palette: FARM_PALETTE,\n  rows: [\n{rs}\n  ],\n}};')
    open('sprites/farm.js', 'w', encoding='utf-8').write('\n'.join(js) + '\n')
    print(len(items), 'sprites,', len(cols), 'colors')


if __name__ == '__main__':
    main()
