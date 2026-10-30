"""환경 그림 PNG → 글자 데이터 JS(원래 색 그대로, → docs/아트_규격.md 5 색). 캐릭터는 png_to_sprite.py.
python tools/art_to_js.py   → sprites/ground.js · sprites/forest.js 를 새로 씀

- 타일셋(Retro Diffusion rd_tile__tileset, 16칸 × 4×5장): 칸마다 네 모서리가 「잔디(g)인지 아닌지」를 색으로 읽어
  corners[네 모서리 번호] = 칸 번호 를 같이 적는다. 번호: 왼위 8 · 오른위 4 · 왼아래 2 · 오른아래 1 (잔디가 아닌 쪽이 1)
  잔디 색 픽셀은 투명으로 — 타일셋마다 잔디 색이 조금씩 달라 경계가 떠 보이므로, 밑에 깐 잔디(grass) · 숲 바닥이 비치게
- 물건: 투명은 '.', 열매처럼 빨간 색은 picked(땄을 때) 팔레트에서 그 그림의 잎 색으로 바꿔 둔다
"""
import json
from PIL import Image

RAW = 'art/raw/'
LETTERS = ''.join(chr(c) for c in range(33, 127) if chr(c) not in '."\'\\`')  # 89자
T = 16


def encode(im):
    """RGBA → (팔레트, 줄들). 색이 글자 수보다 많으면 줄인다(티 안 나는 정도)"""
    im = im.convert('RGBA')
    colors = {p[:3] for p in im.getdata() if p[3] >= 128}
    if len(colors) > len(LETTERS):
        alpha = im.getchannel('A')
        im = im.convert('RGB').quantize(len(LETTERS), method=Image.Quantize.MEDIANCUT).convert('RGB')
        im.putalpha(alpha)
        colors = {p[:3] for p in im.getdata() if p[3] >= 128}
    used = sorted(colors, key=sum)
    ch = {c: LETTERS[i] for i, c in enumerate(used)}
    w, h = im.size
    px = im.load()
    rows = [''.join(ch[px[x, y][:3]] if px[x, y][3] >= 128 else '.' for x in range(w)) for y in range(h)]
    return {ch[c]: '#%02x%02x%02x' % c for c in used}, rows


def tileset(path, grass_tile):
    im = Image.open(RAW + path).convert('RGB')
    gx, gy = grass_tile
    grass = set(im.crop((gx * T, gy * T, gx * T + T, gy * T + T)).getdata())
    corners = {}
    for r in range(im.height // T):
        for c in range(im.width // T):
            n = 0
            for bit, (dx, dy) in zip((8, 4, 2, 1), ((0, 0), (T - 3, 0), (0, T - 3), (T - 3, T - 3))):
                px = [im.getpixel((c * T + dx + i, r * T + dy + j)) for i in range(3) for j in range(3)]
                if sum(p in grass for p in px) <= 4: n |= bit
            corners.setdefault(n, r * (im.width // T) + c)
    assert len(corners) == 16, f'{path}: 모서리 조합이 {len(corners)}가지뿐'
    rgba = Image.open(RAW + path).convert('RGBA')
    rgba.putdata([(0, 0, 0, 0) if p[:3] in grass else p for p in rgba.getdata()])
    pal, rows = encode(rgba)
    return {'palette': pal, 'rows': rows, 'cols': im.width // T, 'corners': corners}


def thing(path, berries=False):
    pal, rows = encode(Image.open(RAW + path))
    out = {'palette': pal, 'rows': rows}
    if berries:
        rgb = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in pal.items()}
        red = [k for k, (r, g, b) in rgb.items() if r > g + 50 and r > b + 30]
        leaf = max((k for k in rgb if k not in red), key=lambda k: rgb[k][1] - rgb[k][0])
        out['picked'] = {k: pal[leaf] for k in red}
    return out


def write(name, comment, obj):
    body = ',\n'.join(f'  {k}: {json.dumps(v, ensure_ascii=False)}' for k, v in obj.items())
    open(f'sprites/{name}.js', 'w', encoding='utf-8').write(
        f'// {comment}\n// tools/art_to_js.py 가 만든 파일. 손으로 고치지 않는다(원본 PNG는 art/raw)\n'
        f'const SPR_{name.upper()} = {{\n{body},\n}};\n')


if __name__ == '__main__':
    import os
    os.makedirs('sprites', exist_ok=True)
    write('ground', '땅 그림. 타일셋은 듀얼 그리드용(→ docs/기술.md 1 땅 그리기)', {
        'soil': tileset('tiles_grass_soil2.png', (0, 4)),
        'path': tileset('tiles_grass_path.png', (0, 3)),
        'grass': thing('grass_base.png'),   # 길 타일셋의 잔디 칸을 잘라 둔 것
        'forest': thing('forest_floor_0.png'),
    })
    write('forest', '숲 그림. 크기 · 기준점은 → docs/아트_규격.md 2', {
        'wood': thing('tree_1.png'),
        'stone': thing('rock_0.png'),
        'bush': thing('bush_1.png', berries=True),
    })
    print('sprites/ground.js · sprites/forest.js')
