# Clean-foundation overlay

The base is upstream `twentyhq/twenty` at `refs/tags/twenty/v2.37.0`, commit
`6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`, tree
`3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`.

`mhoo-os/mhoo-twenty` is legacy evidence only. Its frozen main receipt is
`cbf80755521cee7b0e3fbea0c9d17eaf7582b1a7`; no legacy commit is merged or
cherry-picked into this repository.

Initial permitted overlay paths:

- `.twenty-source`
- `AGENTS.md`
- `docs/provenance/clean-foundation-overlay.md`
- `scripts/provenance/verify-source.sh`

Later overlay commits append trajectory evaluation and the clean runtime CI to
this list. Nothing else is implicitly permitted.
