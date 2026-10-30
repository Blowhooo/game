"""PixelLab 캐릭터 내려받기(zip을 푼 폴더) → 게임용 한 장 그림(PNG) + 자리표(JS).

쓰는 법:
  python shared/tools/pixellab_sheet.py <푼 폴더> <출력 폴더> <이름> [칸 크기=48]

- 폴더 안의 metadata.json을 읽어 rotations(멈춘 모습)는 'stand', 동작은 이름 그대로 넣는다.
- 동작마다 모든 프레임을 합친 테두리로 사람 위치를 찾아, 가운데 · 발끝을 맞춰 칸 크기로 자른다
  (캐릭터마다 캔버스 크기가 달라도 같은 칸에 같은 자리로 들어간다).
- 줄 하나 = 동작 하나의 방향 하나. 자리표는 window.SHEETS[이름] 에 담긴다
  (브라우저에서 파일을 바로 열어도 읽히도록 JSON 대신 JS).
"""
import json
import os
import sys

from PIL import Image

DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']


def main():
    src, out_dir, name = sys.argv[1], sys.argv[2], sys.argv[3]
    cell = int(sys.argv[4]) if len(sys.argv) > 4 else 48
    meta = json.load(open(os.path.join(src, 'metadata.json'), encoding='utf-8'))
    frames = meta['states'][0]['frames'] if 'states' in meta else meta['frames']
    base = src if 'states' not in meta else src

    rows = []  # (동작, 방향, [경로...])
    for d in DIRS:
        if d in frames.get('rotations', {}):
            rows.append(('stand', d, [frames['rotations'][d]]))
    for anim, dirs in frames.get('animations', {}).items():
        for d in DIRS:
            if d in dirs:
                rows.append((anim, d, dirs[d]))

    imgs = {p: Image.open(os.path.join(base, p)).convert('RGBA') for _, _, ps in rows for p in ps}

    # 동작마다 발 위치가 다를 수 있다(PixelLab 걷기가 멈춘 모습보다 몇 칸 위에 그려지기도 함)
    # → 동작별로 모든 프레임을 합친 테두리를 구해, 가운데 · 발끝을 칸에 맞춘다
    boxes = {}
    for anim, _, ps in rows:
        for p in ps:
            bb = imgs[p].getbbox()
            if not bb:
                continue
            o = boxes.get(anim)
            boxes[anim] = bb if not o else (min(o[0], bb[0]), min(o[1], bb[1]), max(o[2], bb[2]), max(o[3], bb[3]))

    ncol = max(len(ps) for _, _, ps in rows)
    sheet = Image.new('RGBA', (ncol * cell, len(rows) * cell))
    table = {}
    for ri, (anim, d, ps) in enumerate(rows):
        l, t, r, b = boxes[anim]
        x0 = (l + r) // 2 - cell // 2
        y0 = b + 1 - cell  # 발끝 아래 1칸 여유
        for ci, p in enumerate(ps):
            sheet.alpha_composite(imgs[p].crop((x0, y0, x0 + cell, y0 + cell)), (ci * cell, ri * cell))
        table.setdefault(anim, {})[d] = [ri, len(ps)]

    os.makedirs(out_dir, exist_ok=True)
    sheet.save(os.path.join(out_dir, name + '.png'))
    js = 'window.SHEETS=window.SHEETS||{};SHEETS[%s]=%s;\n' % (
        json.dumps(name), json.dumps({'src': name + '.png', 'cell': cell, 'anims': table}))
    open(os.path.join(out_dir, name + '.js'), 'w', encoding='utf-8').write(js)
    print(name, sheet.size, {a: len(v) for a, v in table.items()})


if __name__ == '__main__':
    main()
