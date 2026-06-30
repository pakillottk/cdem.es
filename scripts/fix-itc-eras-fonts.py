#!/usr/bin/env python3
"""Convert ITC Eras CFF/OTF fonts to browser-safe TrueType WOFF2."""

from __future__ import annotations

import os
from pathlib import Path

from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / "fonts-backup-itc-eras-ultra"
OUT_DIR = ROOT / "public" / "fonts" / "itc-eras-ultra"


def cff_to_ttf_woff2(src_otf: Path, out_woff2: Path) -> None:
    font = TTFont(src_otf)
    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()

    glyf = newTable("glyf")
    glyf.glyphs = {}
    for name in glyph_order:
        pen = TTGlyphPen(glyph_set)
        cu2qu = Cu2QuPen(pen, max_err=1.0, reverse_direction=True)
        glyph_set[name].draw(cu2qu)
        glyf.glyphs[name] = pen.glyph()

    for tag in ("CFF ", "GPOS", "VORG"):
        if tag in font:
            del font[tag]

    font["glyf"] = glyf
    font["loca"] = newTable("loca")

    maxp = font["maxp"]
    maxp.tableVersion = 0x00010000
    maxp.numGlyphs = len(glyph_order)
    maxp.maxZones = 1
    maxp.maxTwilightPoints = 0
    maxp.maxStorage = 0
    maxp.maxFunctionDefs = 0
    maxp.maxInstructionDefs = 0
    maxp.maxStackElements = 0
    maxp.maxSizeOfInstructions = 0
    maxp.maxComponentElements = 0
    maxp.maxComponentDepth = 0

    font["post"].formatType = 3.0
    font.sfntVersion = "\000\001\000\000"
    font.flavor = "woff2"
    font.save(out_woff2)


def main() -> None:
    if not BACKUP_DIR.is_dir():
        raise SystemExit(f"Missing backup directory: {BACKUP_DIR}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for src in sorted(BACKUP_DIR.glob("*.otf")):
        out = OUT_DIR / f"{src.stem}.woff2"
        print(f"Converting {src.name} -> {out.name}")
        cff_to_ttf_woff2(src, out)


if __name__ == "__main__":
    main()
