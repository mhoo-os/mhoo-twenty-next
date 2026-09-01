# Mhoo asset family provenance

**ARCHITECTURE IMPACT: LOCAL**

This directory is owned by `mhoo-twenty-next` and contains Mhoo customer-facing
derivatives only. Twenty's upstream icon family remains under
`public/images/icons/` and is used by the explicit upstream fallback preset.

## Source custody

The immutable source is the PNG supplied in the originating ChatGPT thread:

- filename: `Codex Image Aug 30, 2026, 05_53_07 AM.png`
- custodied path: `mhoo-snout-source.png`
- dimensions: `1470 × 1070`
- bytes: `1,058,452`
- SHA-256: `6d4f6bc2532274cb919f080eef754af68628600f877595d94e9eb83fd366cefa`
- format: PNG, RGB with alpha channel
- transparency: present

The original bytes are copied without cleanup, cropping, recoloring, or
redesign. The two vertical marks are the pig snout and must remain legible as a
snout at small sizes. The manifest records the hash of the source and every
derived file.

## Reproduction

From the repository root, install or activate Pillow, then run:

```text
python3 scripts/generate_mhoo_assets.py
python3 scripts/verify_mhoo_assets.py
```

To custody the original source on a fresh checkout before generation:

```text
python3 scripts/generate_mhoo_assets.py --source "/path/to/Codex Image Aug 30, 2026, 05_53_07 AM.png"
```

The generator rejects a source whose bytes, dimensions, PNG format, or alpha
channel differ from the governed source. It emits deterministic PNGs using
Lanczos containment, fixed safe-area padding, fixed backgrounds, and a fixed
PNG compression level. It also emits a multi-resolution `.ico` favicon.

No vector export is claimed: tracing the supplied raster would introduce
unverified geometry drift. The checked-in family therefore stays raster-only.

## Surface mapping

The canonical IDs consumed by the shared contract are represented by these
manifest purposes:

- `mhoo-snout-transparent-1024.png`: transparent product mark;
- `mhoo-snout-light-1024.png` and `mhoo-snout-dark-1024.png`: fixed-surface
  marks;
- `favicon/`: browser favicon sizes and `.ico`;
- `pwa/`: standard and maskable PWA icons;
- `android/`, `ios/`, and `windows11/`: platform icon matrices;
- `mhoo-email-600x436.png`: email-safe raster;
- `mhoo-workspace-96.png`: default workspace/avatar-sized mark.

An output may be used only through the selected product brand contract. The
upstream fallback must not load this directory.

## Accessibility guidance

- Use alt text `Mhoo pig snout mark` when the mark conveys identity; use an
  empty alt attribute when adjacent text already names Mhoo.
- Keep the safe-area padding encoded by the generator. Do not crop the snout
  or stretch the source aspect ratio.
- Do not render the mark below 16px where the snout openings cease to be
  distinguishable; use adjacent text for identity at smaller effective sizes.
- Use the light variant on light surfaces and the dark variant on dark surfaces;
  verify contrast with the actual surrounding surface before publication.
- Maskable icons use additional padding so platform masks do not clip the
  snout. Reduced-motion and keyboard behavior are unaffected because these are
  static assets.

The legal state, attribution, and publication approval remain owned by
MHO-181; this provenance record does not approve legal text or production
release.
