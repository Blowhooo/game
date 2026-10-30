"""PNG 여러 장 → JS 한 파일(그림을 글자로 담음).

쓰는 법:
  python shared/tools/png_bundle.py <출력.js> <png...>

브라우저에서 파일을 바로 열면(file://) 3D(WebGL)는 바깥 그림 파일을 읽지 못한다.
그림을 JS 안에 담아 두면 어디서 열어도 읽힌다. 담긴 그림은 window.IMGDATA['파일이름.png'].
(공용 core.js의 G.img 가 IMGDATA에 같은 이름이 있으면 그것을 쓴다)
"""
import base64
import json
import os
import sys

out, pngs = sys.argv[1], sys.argv[2:]
data = {os.path.basename(p): 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode() for p in pngs}
with open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write('window.IMGDATA=Object.assign(window.IMGDATA||{},%s);\n' % json.dumps(data))
print(out, len(data), 'images', os.path.getsize(out), 'bytes')
