#!/usr/bin/env python3
"""Generate the governed Mhoo raster asset family from the supplied source PNG.

The source file is intentionally checked into the target asset directory.  A
caller may pass an external source path once, but every subsequent invocation
without --source must use and verify the custodied bytes in the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = REPOSITORY_ROOT / "packages/twenty-front/public/images/mhoo"
SOURCE_FILENAME = "mhoo-snout-source.png"
MANIFEST_FILENAME = "asset-manifest.json"
EXPECTED_SOURCE_SHA256 = (
    "6d4f6bc2532274cb919f080eef754af68628600f877595d94e9eb83fd366cefa"
)
EXPECTED_SOURCE_SIZE = (1470, 1070)
EXPECTED_SOURCE_BYTES = 1_058_452
DARK_BACKGROUND = (14, 14, 17, 255)
LIGHT_BACKGROUND = (255, 255, 255, 255)


@dataclass(frozen=True)
class RasterSpec:
    relative_path: str
    width: int
    height: int
    purpose: str
    background: tuple[int, int, int, int] | None
    padding: float


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_source(path: Path) -> None:
    if path.stat().st_size != EXPECTED_SOURCE_BYTES:
        raise ValueError(
            f"source byte size changed: {path.stat().st_size} != "
            f"{EXPECTED_SOURCE_BYTES}"
        )

    actual_hash = sha256(path)
    if actual_hash != EXPECTED_SOURCE_SHA256:
        raise ValueError(
            f"source SHA-256 changed: {actual_hash} != {EXPECTED_SOURCE_SHA256}"
        )

    with Image.open(path) as image:
        if image.format != "PNG":
            raise ValueError(f"source format changed: {image.format}")
        if image.size != EXPECTED_SOURCE_SIZE:
            raise ValueError(f"source dimensions changed: {image.size}")
        if "A" not in image.getbands():
            raise ValueError("source must retain an alpha channel")


def rgba_source(path: Path) -> Image.Image:
    image = Image.open(path)
    image.load()
    return image.convert("RGBA")


def render(source: Image.Image, width: int, height: int,
           background: tuple[int, int, int, int] | None,
           padding: float) -> Image.Image:
    if not 0 <= padding < 0.5:
        raise ValueError(f"padding must be in [0, 0.5): {padding}")

    available_width = max(1, round(width * (1 - 2 * padding)))
    available_height = max(1, round(height * (1 - 2 * padding)))
    scale = min(available_width / source.width, available_height / source.height)
    resized_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    resized = source.resize(resized_size, Image.Resampling.LANCZOS)
    canvas = Image.new(
        "RGBA",
        (width, height),
        background if background is not None else (0, 0, 0, 0),
    )
    position = (
        (width - resized.width) // 2,
        (height - resized.height) // 2,
    )
    canvas.alpha_composite(resized, position)
    return canvas


def raster_specs() -> list[RasterSpec]:
    specs = [
        RasterSpec(
            "mhoo-snout-transparent-1024.png",
            1024,
            1024,
            "transparent product mark",
            None,
            0.06,
        ),
        RasterSpec(
            "mhoo-snout-light-1024.png",
            1024,
            1024,
            "product mark on a fixed light surface",
            LIGHT_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "mhoo-snout-dark-1024.png",
            1024,
            1024,
            "product mark on a fixed dark surface",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "mhoo-email-600x436.png",
            600,
            436,
            "email-safe raster mark",
            LIGHT_BACKGROUND,
            0,
        ),
        RasterSpec(
            "mhoo-workspace-96.png",
            96,
            96,
            "default workspace/avatar mark",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "favicon/mhoo-favicon-16.png",
            16,
            16,
            "browser favicon",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "favicon/mhoo-favicon-32.png",
            32,
            32,
            "browser favicon",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "favicon/mhoo-favicon-48.png",
            48,
            48,
            "browser favicon",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "pwa/mhoo-pwa-192.png",
            192,
            192,
            "PWA install icon",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "pwa/mhoo-pwa-512.png",
            512,
            512,
            "PWA install icon",
            DARK_BACKGROUND,
            0.06,
        ),
        RasterSpec(
            "pwa/mhoo-pwa-maskable-512.png",
            512,
            512,
            "maskable PWA install icon",
            DARK_BACKGROUND,
            0.20,
        ),
    ]

    for size in (48, 72, 96, 144, 192, 512):
        specs.append(
            RasterSpec(
                f"android/android-launchericon-{size}-{size}.png",
                size,
                size,
                "Android launcher icon",
                DARK_BACKGROUND,
                0.06,
            )
        )

    for size in (
        16,
        20,
        29,
        32,
        40,
        50,
        57,
        58,
        60,
        64,
        72,
        76,
        80,
        87,
        100,
        114,
        120,
        128,
        144,
        152,
        167,
        180,
        192,
        256,
        512,
        1024,
    ):
        specs.append(
            RasterSpec(
                f"ios/{size}.png",
                size,
                size,
                "Apple touch icon matrix",
                DARK_BACKGROUND,
                0.06,
            )
        )

    for name, dimensions in {
        "SmallTile": (71, 89, 107, 142, 284),
        "Square150x150Logo": (150, 188, 225, 300, 600),
        "Wide310x150Logo": (310, 388, 465, 620, 1240),
        "LargeTile": (310, 388, 465, 620, 1240),
        "Square44x44Logo.scale": (44, 55, 66, 88, 176),
        "StoreLogo": (50, 63, 75, 100, 200),
        "SplashScreen": (620, 775, 930, 1240, 2480),
    }.items():
        scale_names = ("100", "125", "150", "200", "400")
        for scale_name, size in zip(scale_names, dimensions):
            if name == "Wide310x150Logo":
                width, height = size, round(size * 150 / 310)
            elif name == "SplashScreen":
                width, height = size, round(size * 300 / 620)
            else:
                width = height = size
            prefix = name.removesuffix(".scale")
            specs.append(
                RasterSpec(
                    f"windows11/{prefix}.scale-{scale_name}.png",
                    width,
                    height,
                    "Windows application icon matrix",
                    DARK_BACKGROUND,
                    0.08,
                )
            )

    for suffix, background in (
        ("targetsize", DARK_BACKGROUND),
        ("altform-unplated_targetsize", DARK_BACKGROUND),
        ("altform-lightunplated_targetsize", LIGHT_BACKGROUND),
    ):
        for size in (16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256):
            specs.append(
                RasterSpec(
                    f"windows11/Square44x44Logo.{suffix}-{size}.png",
                    size,
                    size,
                    "Windows application icon target size",
                    background,
                    0.08,
                )
            )

    return specs


def write_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(
        path,
        format="PNG",
        optimize=False,
        compress_level=9,
    )


def write_favicon(source: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    icon = render(source, 512, 512, DARK_BACKGROUND, 0.06)
    icon.save(
        path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


def manifest_entry(path: Path, relative_path: str, purpose: str,
                   source_hash: str, transformation: str) -> dict[str, object]:
    with Image.open(path) as image:
        dimensions: list[int] | list[list[int]]
        if path.suffix.lower() == ".ico":
            dimensions = [[16, 16], [32, 32], [48, 48]]
        else:
            dimensions = [image.width, image.height]
        mime_type = "image/x-icon" if path.suffix.lower() == ".ico" else "image/png"

    return {
        "path": relative_path,
        "purpose": purpose,
        "dimensions": dimensions,
        "mime_type": mime_type,
        "sha256": sha256(path),
        "source_sha256": source_hash,
        "transformation": transformation,
    }


def generate(source_path: Path) -> None:
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    source_path = source_path.resolve()
    verify_source(source_path)
    custodied_source = ASSET_ROOT / SOURCE_FILENAME
    if source_path != custodied_source.resolve():
        shutil.copyfile(source_path, custodied_source)
    verify_source(custodied_source)

    source = rgba_source(custodied_source)
    source_hash = sha256(custodied_source)
    entries = [
        {
            "path": SOURCE_FILENAME,
            "purpose": "immutable supplied source and transparent master input",
            "dimensions": list(EXPECTED_SOURCE_SIZE),
            "mime_type": "image/png",
            "sha256": source_hash,
            "source_sha256": source_hash,
            "transformation": "none; original bytes preserved",
        }
    ]

    for spec in raster_specs():
        output_path = ASSET_ROOT / spec.relative_path
        image = render(
            source,
            spec.width,
            spec.height,
            spec.background,
            spec.padding,
        )
        write_png(image, output_path)
        entries.append(
            manifest_entry(
                output_path,
                spec.relative_path,
                spec.purpose,
                source_hash,
                (
                    f"RGBA Lanczos resize, contain with {spec.padding:.2f} "
                    f"safe-area padding, background={spec.background}"
                ),
            )
        )

    favicon_path = ASSET_ROOT / "favicon/mhoo-favicon.ico"
    write_favicon(source, favicon_path)
    entries.append(
        manifest_entry(
            favicon_path,
            "favicon/mhoo-favicon.ico",
            "multi-resolution browser favicon",
            source_hash,
            "RGBA Lanczos resize into a dark 512px canvas, encoded at 16/32/48px",
        )
    )

    manifest = {
        "schema_version": 1,
        "asset_family": "mhoo-snout",
        "source": {
            "path": SOURCE_FILENAME,
            "filename": "Codex Image Aug 30, 2026, 05_53_07 AM.png",
            "sha256": source_hash,
            "bytes": EXPECTED_SOURCE_BYTES,
            "dimensions": list(EXPECTED_SOURCE_SIZE),
            "mime_type": "image/png",
            "color_profile": "RGB with alpha channel",
            "transparency": "present",
        },
        "asset_root": "/images/mhoo/",
        "vector_export": {
            "status": "not-produced",
            "reason": "The supplied raster is retained without tracing drift; no vector-compatible export is claimed.",
        },
        "assets": entries,
    }
    (ASSET_ROOT / MANIFEST_FILENAME).write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        help="optional source PNG; it is copied into the governed asset directory",
    )
    args = parser.parse_args()
    source = args.source or (ASSET_ROOT / SOURCE_FILENAME)
    generate(source)
    print(f"generated {len(json.loads((ASSET_ROOT / MANIFEST_FILENAME).read_text())['assets'])} assets")


if __name__ == "__main__":
    main()
