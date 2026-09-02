# MHO-146 common-loop timing

Captured on 2026-09-03 in the isolated target worktree with Node 24.16.0 and
Yarn 4.13.0. The package was already checked out; immutable dependency
installation is reported separately.

| Step | Real time |
| --- | ---: |
| yarn fixtures:generate | 0.49s |
| yarn test:unit | 0.74s |
| yarn render:evidence | 0.69s |
| yarn lint | 0.39s |
| yarn typecheck | 2.75s |
| Common loop, excluding install | 5.06s |
| yarn install --immutable | 2.55s |
| Full install plus common loop | 7.61s |

The old PR recorded 5.66s excluding install. That historical receipt is
retained only for comparison; the values above are the target-port receipt.
