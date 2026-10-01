"""Manifest and upload helpers for Cloudflare MCP-authenticated static deployments.

No account API credential is required here. Upload sessions are short-lived tokens
issued by the MCP. Keep session/completion files under ignored artifacts/ and delete
credentials after deployment. Final deployment is performed through Cloudflare MCP.
"""
import argparse
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import urllib.request
import urllib.error

parser = argparse.ArgumentParser()
sub = parser.add_subparsers(dest='command', required=True)
manifest_args = sub.add_parser('manifest')
manifest_args.add_argument('--directory', default='dist')
manifest_args.add_argument('--output', required=True)
upload_args = sub.add_parser('upload')
upload_args.add_argument('--directory', default='dist')
upload_args.add_argument('--manifest', required=True)
upload_args.add_argument('--session', required=True)
upload_args.add_argument('--account-id', required=True)
upload_args.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(args.directory).resolve()


def write_private(path, value):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with os.fdopen(os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as file:
        json.dump(value, file)


if args.command == 'manifest':
    manifest = {}
    for file in sorted(root.rglob('*')):
        if file.is_file() and not any(part.startswith('.') for part in file.relative_to(root).parts) and file.name not in {'_headers', '_redirects'}:
            data = file.read_bytes()
            manifest['/' + file.relative_to(root).as_posix()] = {'hash': hashlib.sha256(data).hexdigest()[:32], 'size': len(data)}
    write_private(args.output, manifest)
    print(f'Prepared {len(manifest)} assets, {sum(item["size"] for item in manifest.values())} bytes.')
else:
    manifest = json.loads(Path(args.manifest).read_text())
    session = json.loads(Path(args.session).read_text())
    by_hash = {meta['hash']: (key, meta) for key, meta in manifest.items()}
    token = session['jwt']
    completion = token if not session['buckets'] else None
    for index, bucket in enumerate(session['buckets']):
        boundary = 'special-' + os.urandom(16).hex()
        body = bytearray()
        for content_hash in bucket:
            key, meta = by_hash[content_hash]
            file = (root / key.lstrip('/')).resolve()
            if not file.is_relative_to(root):
                raise SystemExit('Asset path escaped the deployment directory.')
            data = file.read_bytes()
            if hashlib.sha256(data).hexdigest()[:32] != content_hash or len(data) != meta['size']:
                raise SystemExit('Build changed after manifest creation; create a fresh upload session.')
            mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
            body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{content_hash}"; filename="{content_hash}"\r\nContent-Type: {mime}\r\n\r\n'.encode())
            body.extend(base64.b64encode(data))
            body.extend(b'\r\n')
        body.extend(f'--{boundary}--\r\n'.encode())
        request = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{args.account_id}/workers/assets/upload?base64=true', data=bytes(body), headers={'Authorization': f'Bearer {token}', 'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise SystemExit(f'Asset upload returned HTTP {error.code}; inspect Cloudflare before retrying.') from None
        if not result.get('success'):
            raise SystemExit('Asset upload failed; no deployment was performed.')
        if result.get('result', {}).get('jwt'):
            completion = result['result']['jwt']
        print(f'Uploaded bucket {index + 1}/{len(session["buckets"])} ({len(bucket)} assets).')
    if not completion:
        raise SystemExit('Cloudflare did not issue a completion token; no deployment was performed.')
    write_private(args.output, {'jwt': completion})
    print('All assets uploaded; completion token saved privately.')
