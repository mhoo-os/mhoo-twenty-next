# Clean Mhoo-Twenty foundation

This repository starts from exact upstream Twenty v2.37.0. Its default branch
must retain that upstream ancestry; never merge, cherry-pick, or import commits
from `mhoo-os/mhoo-twenty`.

The permitted Mhoo overlay is the enumerated set in
`docs/provenance/clean-foundation-overlay.md`: source custody, this operating
contract, trajectory evaluation, and the clean build/runtime controls. Do not
add branding, Mhoo Apps, provider credentials, customer data, or production
deployment behavior before the clean-foundation gate passes.

Use `scripts/provenance/verify-source.sh` before claiming source custody. Keep
secrets out of Git and run the smallest relevant upstream Nx checks.
