#!/usr/bin/env python3
"""Generate Korean/Japanese character lists from multi_language.c tables."""

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Iterable, Tuple

ROOT = Path(__file__).resolve().parents[1]
MULTI_LANGUAGE_PATH = ROOT / "multi_language.c"
KOR_CHARS_PATH = ROOT / "fonts" / "kor_chars.txt"
JPN_CHARS_PATH = ROOT / "fonts" / "jpn_chars.txt"


def _decode_literals(line: str) -> list[str]:
    """Return decoded string literals found in the line."""
    literals = re.findall(r'"((?:\\.|[^"\\])*)"', line)
    return [ast.literal_eval(f'"{value}"') for value in literals]


def _is_ascii(ch: str) -> bool:
    """Return True when the character is ASCII (codepoint < 128)."""
    return ord(ch) < 128


def _collect_chars(strings: Iterable[str]) -> set[str]:
    chars: set[str] = set()
    for value in strings:
        for ch in value:
            if ch == "\n" or _is_ascii(ch):
                continue
            chars.add(ch)
    return chars


def _extract_tables(source: str) -> Tuple[set[str], set[str]]:
    kor_strings: list[str] = []
    jpn_strings: list[str] = []

    state: str | None = None
    for raw_line in source.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("//"):
            continue

        if line.startswith("const lang_item_t string_table[]"):
            state = "string"
            continue
        if line.startswith("const active_lang_item_t active_table[]"):
            state = "active"
            continue
        if state and line.startswith("};"):
            state = None
            continue
        if not state or not line.startswith("{") or "NULL" in line:
            continue

        decoded = _decode_literals(line)
        if state == "string" and len(decoded) >= 2:
            kor_strings.append(decoded[0])
            jpn_strings.append(decoded[1])
        elif state == "active" and len(decoded) >= 3:
            kor_strings.append(decoded[1])
            jpn_strings.append(decoded[2])

    return _collect_chars(kor_strings), _collect_chars(jpn_strings)


def _write_chars(path: Path, chars: set[str]) -> None:
    content = "".join(sorted(chars)) + "\n"
    path.write_text(content, encoding="utf-8")


def main() -> None:
    source = MULTI_LANGUAGE_PATH.read_text(encoding="utf-8")
    kor_chars, jpn_chars = _extract_tables(source)
    _write_chars(KOR_CHARS_PATH, kor_chars)
    _write_chars(JPN_CHARS_PATH, jpn_chars)
    print(f"Updated {KOR_CHARS_PATH.relative_to(ROOT)} with {len(kor_chars)} chars")
    print(f"Updated {JPN_CHARS_PATH.relative_to(ROOT)} with {len(jpn_chars)} chars")


if __name__ == "__main__":
    main()
