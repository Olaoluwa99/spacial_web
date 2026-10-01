"""Export built release assets without a runtime dependency on the Android checkout."""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else WEB.parent / 'Special'
STYLES = ['glassmorphism', 'neo-brutalism', 'kinetic-type', 'aurora-shaders', 'claymorphism', 'bento-motion']
manifest = {}
for style in STYLES:
    bundle = SOURCE / 'bundles' / style
    spec = json.loads((bundle / 'bundle.json').read_text())
    subprocess.run([sys.executable, str(SOURCE / 'tools/bundle-build/build.py'), style], check=True, cwd=SOURCE)
    archive = SOURCE / 'build/bundles' / f'{style}-{spec["version"]}.zip'
    release = WEB / 'public/releases' / archive.name
    release.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(archive, release)
    demo = WEB / 'public/demos' / style
    demo.mkdir(parents=True, exist_ok=True)
    for p in (bundle / 'platforms/web').iterdir():
        if p.is_file() and p.suffix in {'.html', '.css', '.js'}:
            shutil.copy2(p, demo / p.name)
    reference = WEB / 'public/references' / f'{style}.png'
    reference.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(bundle / 'reference/showcase.png', reference)
    tokens = json.loads((bundle / 'tokens.json').read_text())
    motion = json.loads((bundle / 'motion.json').read_text())
    manifest[style] = {
        'version': spec['version'], 'download': f'/releases/{release.name}',
        'bytes': release.stat().st_size, 'sha256': hashlib.sha256(release.read_bytes()).hexdigest(),
        'reference': f'/references/{style}.png', 'demo': f'/demos/{style}/example.html',
        'tokens': tokens, 'motion': motion,
    }
(WEB / 'src/data/releases.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print(f'Exported {len(manifest)} versioned bundles, demos, references and metadata.')
