# Twenty repository custody and cleanup map

Date: 2026-09-22 (Asia/Bangkok)

Scope: local Twenty repositories and their registered worktrees. This receipt records source custody only. It does not authorize merge, push, deployment, import, App installation, branch deletion, or production changes.

## Decision

- `mhoo-twenty-next` is the current clean-foundation development repository. It starts from Twenty `v2.37.0` and must keep its independent ancestry.
- `/Users/mhoooo/projects/mhoo-os/mhoo-twenty` is a clean legacy checkout whose checked-out branch still records Twenty `v2.30.1`. It has no current product assignment. Preserve its unmerged branches until branch ownership is reviewed.
- `/Users/mhoooo/projects/mhoo-os/mhoo-twenty-archon-source` is a clean, separate clone of the `mhoo-twenty` remote at `fa181f911fa2570c05cca9d54ce0f758c6d20d04`. It records Twenty `v2.37.0`, is 21 commits behind local `origin/main`, and has no unique local branch. It is a deletion candidate after the coordinator confirms no external path dependency.
- Never merge or cherry-pick the legacy `mhoo-twenty` history into `mhoo-twenty-next`. Move a capability only through an explicit, provenance-recorded extraction.

## Live checkout custody

| Repository / checkout | Exact head | Branch | State | Classification |
| --- | --- | --- | --- | --- |
| `mhoo-twenty` | `3c565e6710e00b5fa3b6887b9e40dc21d11c2f18` | `fix/candidate-6-wheel-filename` | clean | legacy hold; no current product work |
| `mhoo-twenty-archon-source` | `fa181f911fa2570c05cca9d54ce0f758c6d20d04` | `main` | clean | duplicate clone candidate; confirm path users before deletion |
| `mhoo-twenty-next` | `7117ce1ebdbf9a55de47ed539887723cee0e6a81` | detached from `origin/main` | clean | historical clean checkout; safe reference only |
| `finance-chase-controls/mhoo-twenty-next` | `2d7aa26e2759053d1f9986f073a939d64f2aa03e` | `codex/finance-chase-pdf-controls` | dirty source, tests, scripts | active hold; preserve all changes |
| `clover-independent-current-main` | `33c2abc54d066576ec12d7460ac6c148da4c00d8` | `codex/clover-independent-current-main` | dirty Clover, Finance, release files; remote upstream gone | active hold; preserve all changes |
| `finance-approved-insights` | `29436a21fc23f7f8119e80c4ea4014439dc31117` | `codex/finance-approved-insights` | dirty Finance source and tests | active hold; preserve all changes |
| `jev-twenty-shadow` | `bdf54d434412b4871869295d2d3ce39f805bc91f` | `codex/jev-twenty-shadow` | clean | completed or idle candidate; ownership review before removal |
| `mho-183-closed-beta-runtime` | `5f6cdd318b6a0d5db85b1a12f54e2aaffb65b035` | `codex/mho-183-closed-beta-runtime` | dirty CI, deployment, release scripts | active hold; preserve all changes |
| `same-origin-bootstrap-routing` | `902537a8162988528409cc917afa17a9884aff36` | `codex/same-origin-bootstrap-routing` | dirty front-end routing source | active hold; preserve all changes |
| `mhoo-twenty-next-hass` | `7fb5501bdc108df9ace0c619f7cafe258dde9fcc` | `codex/hass-native-onboarding` | dirty Clover and Finance App source; 27 commits behind upstream | active hold; preserve all changes |
| `twenty-repository-custody` | `9bb47cdbdbee672525762e0c0d1aabfd02203b20` (base) | `codex/twenty-repository-custody-20260922` | documentation only | cleanup receipt owner |

The dirty checkouts contain meaningful application, CI, deployment, test, and operator work. None qualifies as disposable generated output.

## Branch classification rule

The appendices below classify every local branch against the repository's local `origin/main` snapshot on 2026-09-22:

- `integrated`: branch tip is an ancestor of `origin/main`; eligible for later branch deletion after owner and PR checks.
- `preserve-unmerged`: branch tip is not an ancestor of `origin/main`; keep until its owner and associated issue or PR are resolved.
- `checked-out`: branch has a registered worktree and inherits that checkout's custody above.

These labels are cleanup triage. They do not prove a PR state or authorize deletion.

## Safe cleanup performed

Only ignored TypeScript incremental build metadata (`*.tsbuildinfo`) outside dependency trees was removed. No tracked source, untracked source, branch, commit, worktree, Git object, dependency tree, or runtime artifact was deleted.

## Remaining holds

1. Preserve the five dirty `mhoo-twenty-next` feature worktrees and the dirty Hass checkout until their retained owners finish or explicitly surrender custody.
2. Resolve the disappeared upstream for `codex/clover-independent-current-main` before any branch or worktree cleanup.
3. Check issue, PR, and retained-worker ownership for every `preserve-unmerged` branch before deletion.
4. Confirm no scripts, IDE projects, or operators depend on the `mhoo-twenty-archon-source` path before removing that duplicate clone.
5. Keep legacy `v2.30.1` and clean-foundation `v2.37.0` histories separate.

## Branch appendices

The exact generated branch inventories follow. Heads and upstream relationships are local observations and become stale after fetch, commit, merge, or branch mutation.


### legacy mhoo-twenty

| Branch | Head | Upstream | Classification |
| --- | --- | --- | --- |
| `codex/adr0008-twenty-connections` | `a38b295430100faa9800d3e60aea166b00ca9317` | `none` | integrated |
| `codex/allow-root-agents-provenance-overlay` | `fc28e4f3f10908b3181b7d138ed209a6c2a6e050` | `none` | integrated |
| `codex/candidate-6-validator-toolchain` | `fe9273bebbe187410325036ba362d8ea2537ba1e` | `none` | integrated |
| `codex/ci-front-risk-gates` | `d31b7767bfe0e09b2371a8f9398e32b49a39b6b3` | `none` | preserve-unmerged |
| `codex/ci-governance-enforcement-probe` | `44e5e7acba2af308359c5cf6e607ec717563ca5e` | `none` | preserve-unmerged |
| `codex/danger-timeout-main` | `1ce01d51e9db7504dc4a27fcaee8e3f2c97535c6` | `none` | preserve-unmerged |
| `codex/danger-timeout-main-rebase` | `f3aa530cf86c0c916623b612dfe314036dc3c707` | `none` | preserve-unmerged |
| `codex/docs-agents-contract` | `f05dbddbf43ad46f4fc7a3fcb6e96f4f9ce192be` | `none` | integrated |
| `codex/docs-candidate-1-historical` | `0ba0355d23aca328238a342faacdd9933106a62f` | `none` | preserve-unmerged |
| `codex/docs-twenty-framework-accepted` | `e443abecb9e8f6146f8072125be23ff1ee827d7c` | `none` | integrated |
| `codex/fix-foundation-stable-host-shell` | `d0a0050a52693cda661e014dc8559814addb941e` | `none` | preserve-unmerged |
| `codex/fix-sdk-build-race` | `b21f8b81ab4e66626a548156ba10b20d9d8ade38` | `none` | preserve-unmerged |
| `codex/fix-storybook-iframe-reload` | `00fbdbf88f511807fc01954f05f9cbcaab86afaf` | `none` | preserve-unmerged |
| `codex/legacy-agents-setup` | `0ea2764078af5712259e90fc7bda194e25350c67` | `none` | preserve-unmerged |
| `codex/mho-146-fixture-vertical` | `6bef8da9004ea67607315422454a6aa52a65dfd3` | `none` | preserve-unmerged |
| `codex/mho-256-context` | `ceabfc4e6bd642f3f99ddf291d290f14dd23b707` | `none` | preserve-unmerged |
| `codex/mho9-connection-compatibility` | `9545aeacc12b94aa168c94b7852c8bdede59a948` | `none` | integrated |
| `codex/mhoo-brand-assets` | `2784f7598ff35a0ee3524ce8ecdf8b78f4187437` | `none` | preserve-unmerged |
| `codex/mhoo-customer-identity-cleanup` | `77dd8eca46b9e24e709783d63d4ae9543806a300` | `none` | preserve-unmerged |
| `codex/mhoo-snout-v237-branding` | `ad72d3fa8d3bb77727509a8d32f3efbe118898ce` | `none` | preserve-unmerged |
| `codex/mhoo-twenty-candidate-6-custody` | `27f0de6b914e6204654496932416cf0bc198eb09` | `none` | integrated |
| `codex/mhoo-twenty-foundation-phase-4-candidate` | `96f7a0d1e69f2de1b2cb1d47e54ca62bc2117187` | `none` | integrated |
| `codex/mhoo-twenty-trajectory-audit` | `ed27119b2a6e34bf58dd70a0e87ff6e7f70e08ca` | `none` | preserve-unmerged |
| `codex/post-merge-ci-governance-validation` | `0895bfb98f246668078b15b80a05cebbb14617b4` | `none` | integrated |
| `codex/rehearsal-ghcr-pull` | `0b8a253b0188299514f220db1ac0a74b2ba75375` | `none` | preserve-unmerged |
| `codex/trajectory-review-opt-in` | `0223f4c8f3e49ae19d74b2a77fa2296f2f5939bc` | `none` | integrated |
| `codex/twenty-tailnet-serve` | `31a850e05b3f07547633604fd82b22c29639d0d9` | `none` | preserve-unmerged |
| `codex/twenty-v2.37-platform-upgrade` | `075c870f8a573450b97433b11d40f52c297419f8` | `none` | preserve-unmerged |
| `codex/twenty-v237-rebase-validate` | `7a38b8e30e8b55c5bb48baa53349d715aa77b31d` | `none` | integrated |
| `codex/v237-candidate-publication` | `2bb8574186ebb871fefa56723b3100cd4150f50f` | `none` | integrated |
| `codex/v237-mhoo-finance-build-contract` | `5dcd377d66c57a9ca48a6f1c9f55e8db84435704` | `none` | integrated |
| `codex/v237-validator-template-fix` | `d560d026b17043c9728cfc80a6962e8508b7afca` | `none` | integrated |
| `codex/workspace-ai-provider-source` | `aef78eee47361f9abb85219ad7ccadefd506984f` | `none` | preserve-unmerged |
| `fix/candidate-6-wheel-filename` | `3c565e6710e00b5fa3b6887b9e40dc21d11c2f18` | `none` | checked-out |
| `main` | `08d55ab7ed4bbc4e72fee825822c3ce0656c82ef` | `origin/main` | integrated |
| `tanyawit/mho-123-gate-0-fix-the-six-year-engagement-authority-source` | `45ed2a6f5e2e8ea51b42e3591922564871b5af97` | `none` | preserve-unmerged |
| `tanyawit/mho-9-spec-rebuild-clover-read-only-mcp-as-mhoofinance-on-twenty` | `deed0a003b3eb567224e9cd22ddce5406212ab87` | `none` | integrated |

### clean-foundation mhoo-twenty-next

| Branch | Head | Upstream | Classification |
| --- | --- | --- | --- |
| `codex/add-trajectory-reviewer-opt-in` | `5f6cdd318b6a0d5db85b1a12f54e2aaffb65b035` | `origin/codex/add-trajectory-reviewer-opt-in` | preserve-unmerged |
| `codex/ai-editor-guarded-integration` | `8ed8e0bd1c1b2ff7313bbc31b0583c442f6ee5e1` | `none` | preserve-unmerged |
| `codex/ai-editor-lifecycle` | `b199aa05571a05c794d39e1964ce538023b26404` | `origin/codex/ai-editor-lifecycle` | preserve-unmerged |
| `codex/ci-docs-drift` | `a4d85ba3c205f424269694473d5cc9d07c26393c` | `origin/codex/ci-docs-drift` | preserve-unmerged |
| `codex/clover-existing-237-migration` | `707d2d9aa32abc85aeb78ee7bafdf18032fa512e` | `origin/codex/clover-existing-237-migration` | preserve-unmerged |
| `codex/clover-front-standard-runners` | `3f31ec3cf76338e00a90024e84a1dae3bb575fa5` | `none` | preserve-unmerged |
| `codex/clover-frontend-schema-types` | `9413ddfd0043e028cbe96381b51da73029686f51` | `none` | preserve-unmerged |
| `codex/clover-independent-current-main` | `33c2abc54d066576ec12d7460ac6c148da4c00d8` | `origin/codex/clover-independent-current-main` | checked-out |
| `codex/clover-independent-workspaces` | `48242e19c5a20faeb1e6c3a114e451ba76e85d84` | `none` | preserve-unmerged |
| `codex/clover-legal-generated-format` | `96af6f7f2eced67c519f361f65d20b24fb87afe9` | `none` | preserve-unmerged |
| `codex/clover-legal-route-accounting` | `481a0649f62d7628b4de6c4e7e00052e5c933451` | `none` | preserve-unmerged |
| `codex/clover-native-status-acceptance` | `dbe20e011a01c5d9974c73e891644a16763bda84` | `none` | preserve-unmerged |
| `codex/clover-pr32-ci-repair` | `6c30bf08c98a64bfff93433f46ceb41182786078` | `none` | preserve-unmerged |
| `codex/clover-pr32-integrated` | `115379ac72b4690ce37e9c57d27dacca7fe58fed` | `none` | preserve-unmerged |
| `codex/clover-remote-dom-trial` | `9b26a064b4e63e9591e11f1197ec495ddf3bf455` | `none` | preserve-unmerged |
| `codex/clover-status-adapter` | `32929b86c2210e9dc4b8c26859a5eefb16817425` | `none` | preserve-unmerged |
| `codex/clover-status-proof-types` | `ad2895ae836f8a1882c4bc53b581c5e97773ea8a` | `none` | preserve-unmerged |
| `codex/clover-status-route` | `75420b962569004ba68d4d88504b476400d7cc1a` | `none` | preserve-unmerged |
| `codex/clover-two-host-trial` | `8adde912c490e96947e9286f86e1c03bc6c97696` | `none` | preserve-unmerged |
| `codex/clover-workflow-status-wait` | `9506eec85568519b3603066ed111774f5367494c` | `none` | preserve-unmerged |
| `codex/finance-approved-insights` | `29436a21fc23f7f8119e80c4ea4014439dc31117` | `none` | checked-out |
| `codex/finance-benchmark-preparation` | `864175b4f45b480f0412b53f5ef7424d627aed3b` | `origin/codex/finance-benchmark-preparation` | preserve-unmerged |
| `codex/finance-chase-pdf-controls` | `2d7aa26e2759053d1f9986f073a939d64f2aa03e` | `none` | checked-out |
| `codex/finance-follow-up-mutation` | `724b83a993857644c9bdf81bca95bbd1c07c8610` | `none` | preserve-unmerged |
| `codex/finance-loader-same-origin-auth` | `2922dff21a4178ba2ccc0ae7266f8dec6218b0b2` | `origin/codex/finance-loader-same-origin-auth` | preserve-unmerged |
| `codex/finance-question-prototype` | `c1ab8e8d2151f11b09431b6ea8ce14d25ca488d7` | `none` | preserve-unmerged |
| `codex/finance-remote-dom-proof` | `534982e01f19491196877aa56be9ba3d08b1647c` | `none` | preserve-unmerged |
| `codex/finance-saved-read-mho135` | `31a9f7d7f218d6170afe9065aab49aef0773d984` | `origin/codex/finance-saved-read-mho135` | preserve-unmerged |
| `codex/hass-clover-required-current-main` | `42e07b354ebeed8c51e20cf366cac5d2ea888272` | `origin/codex/hass-clover-required-current-main` | preserve-unmerged |
| `codex/hass-clover-required-setup` | `60596da3b944344d2f0872cd810c6ebb914f09e4` | `origin/codex/hass-clover-required-setup` | preserve-unmerged |
| `codex/hass-finance-product-definition` | `86ee71aaa38d7b64fc1d361150c58cc69ca28c1c` | `none` | preserve-unmerged |
| `codex/hass-native-onboarding` | `7fb5501bdc108df9ace0c619f7cafe258dde9fcc` | `origin/codex/hass-native-onboarding` | checked-out |
| `codex/jev-twenty-shadow` | `bdf54d434412b4871869295d2d3ce39f805bc91f` | `none` | checked-out |
| `codex/mho-123-contract-spec` | `6c87e62c9c68661727e980303a6824a7681c4b31` | `none` | preserve-unmerged |
| `codex/mho-126-integration` | `15ff1682a09199eb2f6715f9ed7437c51092300d` | `origin/codex/mho-126-integration` | preserve-unmerged |
| `codex/mho-146-finance-next` | `4d08ae4f7be2498faac0de33b17e335ecff053a9` | `origin/main` | preserve-unmerged |
| `codex/mho-155-assets` | `06a8a8fde89fe35df0b66225fa73b94bcc5ea879` | `origin/codex/mho-155-assets` | preserve-unmerged |
| `codex/mho-158-brand-contract` | `f7c890ec0c9d99796fbbc2b38713304a71468433` | `origin/codex/mho-158-brand-contract` | preserve-unmerged |
| `codex/mho-159-brand-resolver` | `2ed14515801e568a655244420ec854979a323083` | `origin/codex/mho-159-brand-resolver` | preserve-unmerged |
| `codex/mho-161-client-config` | `7cd27fae074d5e94e4cf97d9f204e45fd862e162` | `origin/codex/mho-161-client-config` | preserve-unmerged |
| `codex/mho-163-workspace-presentation` | `8523c989a01d1ee4528dbe419abeaae2637ead7b` | `origin/codex/mho-163-workspace-presentation` | preserve-unmerged |
| `codex/mho-168-browser-shell` | `07108b8750eee2449d243220b7c6931f07b7877e` | `origin/codex/mho-168-browser-shell` | preserve-unmerged |
| `codex/mho-171-auth-onboarding` | `7ead6e152f1859bb059989b4588a6aab499f306a` | `origin/codex/mho-171-auth-onboarding` | preserve-unmerged |
| `codex/mho-173-authenticated-ui` | `8cf1e76e40069f8d631401b71c985fa302949df4` | `origin/codex/mho-173-authenticated-ui` | preserve-unmerged |
| `codex/mho-175-email-brand` | `5b8d05b7ca0627f09f8261aed99f67c54d3c1c35` | `origin/codex/mho-175-email-brand` | preserve-unmerged |
| `codex/mho-175-email-brand-restack` | `ec765fefd73dc4a59c8c68be712746c33a8f6e1f` | `origin/codex/mho-175-email-brand` | preserve-unmerged |
| `codex/mho-177-server-public` | `57c0f6861c05cf8b400328e564760c00d81ee5c7` | `origin/codex/mho-177-server-public` | preserve-unmerged |
| `codex/mho-179-distribution` | `64ab8ddbb5e7dee51d14ff0c416481727f9b00c4` | `origin/codex/mho-179-distribution` | preserve-unmerged |
| `codex/mho-181-visual-preview` | `6feed99a5d8a387ed765caf115d677cec19930b7` | `origin/codex/mho-181-visual-preview` | preserve-unmerged |
| `codex/mho-182-residue` | `11f1e2fb6fed358960316fb4494b62d79b111f67` | `origin/codex/mho-182-residue` | preserve-unmerged |
| `codex/mho-183-closed-beta-runtime` | `5f6cdd318b6a0d5db85b1a12f54e2aaffb65b035` | `none` | checked-out |
| `codex/mho-226-legal-packet-v2` | `a1a986b6a25b25e046f947ed03f4d6ca7d5a9c55` | `origin/codex/mho-181-visual-preview` | preserve-unmerged |
| `codex/mho-240-attachment-type` | `3d2f5e7e180996439d1e3b5184884b77c33c8ab9` | `none` | preserve-unmerged |
| `codex/mho-257-finance-contracts` | `a8c03d62898877449f79a0d76a1b3faa72bd5281` | `origin/codex/mho-257-finance-contracts` | preserve-unmerged |
| `codex/mho-258-read-contract` | `c6cea9c412f1afaeed69e6c525f977692f26d092` | `origin/codex/mho-258-read-contract` | preserve-unmerged |
| `codex/native-clover-cookie-bearer` | `dea1aa06b5079bf75ba631f6f6673c8d5d48603c` | `origin/codex/native-clover-cookie-bearer` | preserve-unmerged |
| `codex/native-default-domain-self-redirect` | `0b51b96ae8ef4396fb37abe767d4bb98ba219904` | `origin/codex/native-default-domain-self-redirect` | preserve-unmerged |
| `codex/native-ordinary-sso-return` | `4ecd91a73c4866cd51ec28cb7198502819ad123e` | `origin/codex/native-ordinary-sso-return` | preserve-unmerged |
| `codex/native-sso-creation-intent` | `55e55925c15172885b4d6e3cdb8ee0f18fe61c95` | `origin/codex/native-sso-creation-intent` | preserve-unmerged |
| `codex/same-origin-bootstrap-routing` | `902537a8162988528409cc917afa17a9884aff36` | `none` | checked-out |
| `codex/twenty-repository-custody-20260922` | `9bb47cdbdbee672525762e0c0d1aabfd02203b20` | `origin/main` | checked-out |
| `codex/upstream-workflow-guards` | `d858d024f5334c03cdb7c5a540bb76e5fb463660` | `none` | preserve-unmerged |
| `codex/workspace-ai-routing` | `a2841f40c1ccae2ad5df6f34b63cf5778848d89a` | `none` | preserve-unmerged |
| `main` | `99edccdfdccc0a2a89efdfdd8bfc8766e643a02e` | `upstream/main` | integrated |
| `mho-184-clean-image-runtime-ci` | `8c04b562b79f7667b1658be2f6318ccf0901548d` | `origin/mho-184-clean-image-runtime-ci` | preserve-unmerged |
| `mho-184-isolated-mail-sink` | `d3c4ba1d610126c8a32d32967a9d1424ffdd3f93` | `origin/mho-184-isolated-mail-sink` | preserve-unmerged |

### archon source clone

| Branch | Head | Upstream | Classification |
| --- | --- | --- | --- |
| `main` | `fa181f911fa2570c05cca9d54ce0f758c6d20d04` | `origin/main` | checked-out |
