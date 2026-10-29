"""Retro Diffusion 생성(텍스트 → 그림)을 API로 직접 부르고 결과를 저장. 키는 .env의 RETRODIFFUSION_API_KEY.
python tools/rd_gen.py 출력.png '{"prompt": "...", "prompt_style": "...", "width": 32, "height": 32}'
  - 그림이 여러 장이면 출력_0.png, 출력_1.png …  · 함께 오는 데이터(타일셋 배치 등)는 출력.json
  - "check_cost": true 를 넣으면 가격만 보고 끝(무료)
"""
import base64, json, sys, time, uuid, urllib.request

URL = 'https://api.retrodiffusion.ai/v2/inferences'


def key():
    for line in open('.env', encoding='utf-8'):
        if line.startswith('RETRODIFFUSION_API_KEY='):
            return line.split('=', 1)[1].strip()
    sys.exit('.env에 RETRODIFFUSION_API_KEY 없음')


def call(method, url, token, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None)
    req.add_header('X-RD-Token', token); req.add_header('Content-Type', 'application/json')
    if method == 'POST': req.add_header('Idempotency-Key', str(uuid.uuid4()))
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read()[:300]}')


def main(out, payload):
    tok = key(); payload.setdefault('num_images', 1)
    if payload.get('check_cost'):
        print('가격', call('POST', URL, tok, payload).get('balance_cost')); return
    task = call('POST', URL, tok, payload)['task_id']
    while True:
        t = call('GET', f'{URL}/tasks/{task}', tok)
        if t['status'] in ('pending', 'running'): time.sleep(3); continue
        if t['status'] == 'failed': sys.exit(f"실패: {t.get('error')}")
        r = t['result']; break
    imgs = r.get('base64_images', [])
    base = out[:-4] if out.endswith('.png') else out
    for i, b in enumerate(imgs):
        path = out if len(imgs) == 1 else f'{base}_{i}.png'
        open(path, 'wb').write(base64.b64decode(b)); print('저장', path)
    extra = {k: v for k, v in r.items() if k not in ('base64_images', 'output_urls')}
    json.dump(extra, open(base + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('비용', r.get('balance_cost'), '잔액', r.get('remaining_balance'))


if __name__ == '__main__':
    main(sys.argv[1], json.loads(sys.argv[2]))
