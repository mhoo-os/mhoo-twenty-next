# Sample investigation UI increment

ARCHITECTURE IMPACT: LOCAL

This App-only increment makes existing sample transactions and their evidence reachable. It does not change the frozen host image release candidate or install anything into a workspace.

Finance groups Overview, Accounts, Transactions, Evidence, Coverage and Exceptions using native v2.37 navigation folders and saved views. Transactions exposes existing date/account/description/exact minor-unit/currency/classification/exclusion/source fields; native records retain their normal opening and filtering behavior. Technical keys and the legacy numeric amount stay available but hidden by default. No object field or source record is changed.

The overview's saved samples now format USD integer text without floating-point conversion and offer **Inspect source evidence**. That action refetches exactly the selected sample, with the same unclassified/excluded filter, through the generated Core client. It reads the linked artifact in that permission-checked query. The panel shows source row/location, original amount/sign, recorded raw values and artifact metadata, and opens the native transaction/source record through the host navigation API. Missing original Files are explicitly unavailable. A Files reference is not represented as verified file bytes or complete custody.

Only sourceArtifact read access is added to the App reader ceiling. No settings, tools, writes, deletes, all-object reads, application run-as or credentials are added. The triggering user's role still intersects the App role. Native navigation visibility is governed by Twenty and the user's permissions. Sample filters and response checks protect the displayed scope; they do not implement authorization. Permission/network errors return no evidence and never retry with a broader query. Missing/mismatched/reclassified records return unavailable. Changing the selection or refreshing unmounts/clears the old evidence; pending responses are cancelled for presentation.

Local validation: App build and full TypeScript check, lint, 94 unit tests (including denied-read/no-fallback, wrong-record/scope changes, missing artifact/file and exact amount precision). Mocked denial tests prove client failure behavior only, not server or cross-workspace permission enforcement.

Before live acceptance, separately install the reviewed App revision after runtime readiness, then verify the native group, table filtering/record opening, 20 sample preservation, successful fact-to-source trace, missing-file notice, loading/empty/error/retry/selection changes, restricted-role and cross-workspace denial, and reload behavior. No live visual or permission proof is claimed here.

Remaining existing-scope gaps: live coverage/exception overview, snapshot-qualified charts and chart-to-filtered-record drilldown, original Files custody, full summary-to-exception-to-fact proof. The pre-existing “Included amount by period” widget remains unqualified (unfiltered aggregate with no period grouping); it must not be treated as financial analysis or a published metric. It is outside this transaction/evidence increment. Complete procedures and case/finding review remain their existing later issues.

Source basis: accepted Twenty v2.37.0 and existing Finance App on main 3dc0083a178668a644395f6433459ef884827abd. Folder support is in NavigationMenuItemManifest.folderUniversalIdentifier and the server manifest converter; native record opening uses AppPath.RecordShowPage via twenty-sdk/front-component.navigate. No new framework or authority is introduced.
