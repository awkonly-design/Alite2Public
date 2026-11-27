#!/usr/bin/env bash
# Regenerate the Korean / Japanese LVGL fonts after you change strings in multi_language.c.
# Needs node (npx lv_font_conv) and python3. The Noto Sans CJK fonts (SIL OFL) are downloaded once.
set -euo pipefail
source "$(dirname "$0")/env.sh"
FONTS="$SKETCH_DIR/fonts"
CACHE="$ROOT/.cache/fonts"; mkdir -p "$CACHE"
BASE="https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF"
[ -f "$CACHE/NotoSansCJKkr-Regular.otf" ] || curl -fL -o "$CACHE/NotoSansCJKkr-Regular.otf" "$BASE/Korean/NotoSansCJKkr-Regular.otf"
[ -f "$CACHE/NotoSansCJKjp-Regular.otf" ] || curl -fL -o "$CACHE/NotoSansCJKjp-Regular.otf" "$BASE/Japanese/NotoSansCJKjp-Regular.otf"

python3 "$SKETCH_DIR/tools/update_lang_chars.py"
npx --yes lv_font_conv --font "$CACHE/NotoSansCJKkr-Regular.otf" --size 16 --bpp 4 --format lvgl --no-compress --no-prefilter --symbols "$(cat "$FONTS/kor_chars.txt")" --output "$FONTS/lv_font_noto_sans_kr_16.c"
npx --yes lv_font_conv --font "$CACHE/NotoSansCJKjp-Regular.otf" --size 16 --bpp 4 --format lvgl --no-compress --no-prefilter --symbols "$(cat "$FONTS/jpn_chars.txt")" --output "$FONTS/lv_font_noto_sans_jp_16.c"

# prefix the static symbols so both fonts can live in one translation unit (locale_fonts.c)
python3 - "$FONTS" "$ROOT" <<'PY'
import re, sys
from pathlib import Path
root = Path(sys.argv[1])
base = sys.argv[2].rstrip('/') + '/'   # keep the header comment free of local absolute paths
def add_prefix(path, prefix):
    text = path.read_text().replace(base, '')
    tokens = {"glyph_bitmap", "glyph_dsc", "cmaps", "font_dsc", "cache"}
    for pat in [r'unicode_list_\d+', r'glyph_id_ofs_list_\d+', r'kern_left_class_mapping', r'kern_right_class_mapping',
                r'kern_class_values', r'kern_classes', r'kern_pair_glyph_ids', r'kern_pair_values', r'kern_pairs']:
        tokens.update(re.findall(pat, text))
    for token in sorted(tokens, key=len, reverse=True):
        text = re.sub(rf'(?<!\.)\b{re.escape(token)}\b', f'{prefix}{token}', text)
    path.write_text(text)
add_prefix(root / 'lv_font_noto_sans_kr_16.c', 'kr_')
add_prefix(root / 'lv_font_noto_sans_jp_16.c', 'jp_')
PY
echo "Fonts regenerated in $FONTS"
