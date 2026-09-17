#!/usr/bin/env python3
"""Genera icone PNG placeholder per il manifest PWA (Step 0).
Zero dipendenze: solo stdlib (struct + zlib). Output deterministico.
Icona = sfondo #0a0a14 + alone viola #b69cff + nucleo ciano #7fe7dc.
Saranno sostituite da icone definitive in Step 8 (D-008 naming)."""

import struct
import zlib
import math
import sys
import os

BG = (0x0a, 0x0a, 0x14, 0xff)
INK_DIM = (0x56, 0x53, 0x70, 0xff)
VIOLET = (0xb6, 0x9c, 0xff, 0xff)
CYAN = (0x7f, 0xe7, 0xdc, 0xff)
TRANSP = (0, 0, 0, 0)


def write_png(path: str, size: int, maskable: bool = False) -> None:
    px = [[BG for _ in range(size)] for _ in range(size)]
    cx = cy = size / 2.0
    # maskable: safe zone è ~80% del diametro; icona più piccola e centrata
    scale = 0.62 if maskable else 0.92
    halo_r = size * 0.30 * scale
    core_r = size * 0.062 * scale
    ring_r = size * 0.137 * scale

    for y in range(size):
        for x in range(size):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            d = math.sqrt(dx * dx + dy * dy)
            if maskable and (dx > size * 0.42 or dy > size * 0.42):
                # fuori safe zone: sfondo pieno (maskable richiede bleed)
                px[y][x] = BG
                continue
            if d < core_r:
                t = 1.0 - (d / core_r) * 0.4
                px[y][x] = blend(VIOLET, t)
            elif d < ring_r + 1.5 and d > ring_r - 1.5:
                # anello ciano sottile
                px[y][x] = CYAN
            elif d < halo_r:
                # alone viola che sfuma
                t = max(0.0, 1.0 - d / halo_r)
                px[y][x] = blend_pair(BG, VIOLET, t * 0.55)
            else:
                px[y][x] = BG

    # bordo leggero dove c'è alone (per definizione icona)
    raw = bytearray()
    for row in px:
        raw.append(0)  # filter type 0
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print(f"  wrote {path} ({size}x{size}, {len(png)} bytes)")


def blend(c, t):
    t = max(0.0, min(1.0, t))
    return (
        int(c[0] * t + BG[0] * (1 - t)),
        int(c[1] * t + BG[1] * (1 - t)),
        int(c[2] * t + BG[2] * (1 - t)),
        255,
    )


def blend_pair(a, b, t):
    t = max(0.0, min(1.0, t))
    return (
        int(a[0] * (1 - t) + b[0] * t),
        int(a[1] * (1 - t) + b[1] * t),
        int(a[2] * (1 - t) + b[2] * t),
        int(a[3] * (1 - t) + b[3] * t),
    )


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("maskable-512.png", 512, True),
        # 1024 per Apple App Store (S8-4; da sostituire con l'icona definitiva a
        # risoluzione piena dopo D-008 naming / design finale).
        ("icon-1024.png", 1024, False),
    ]
    for name, size, maskable in targets:
        write_png(os.path.join(here, name), size, maskable)


if __name__ == "__main__":
    main()
