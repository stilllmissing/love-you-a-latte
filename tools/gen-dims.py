"""Write js/artdims.js: pixel sizes of the staged drink frames, so every frame of a
drink is drawn at one scale and the cup doesn't jump when the picture changes."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
dims = {}
for f in sorted((ROOT / 'assets' / 'steps').glob('a-*.webp')):
    dims[f.stem] = Image.open(f).size
(ROOT / 'js' / 'artdims.js').write_text('window.ART_DIMS = ' + json.dumps(dims, separators=(',', ':')) + ';\n')
print(len(dims), 'frames')
