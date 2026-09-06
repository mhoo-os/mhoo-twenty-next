# Finance workspace preparation

This source increment prepares an empty client-facing entry point and a bounded
CSV validation path. It is not an installed client Workspace or a live importer.
It follows the owner's September 6 instruction to prepare objects, functions and
layouts using available data before clients join. ARCHITECTURE IMPACT: LOCAL.

## Native objects and layout

FinancialAccount gives each bank/card an explicit native identity, masked label
and type. Its bidirectional relation extends the existing FinanceFact object;
nullable exact minor-unit text and currency fields preserve shared money values
without converting through a JavaScript float or the legacy USD widget field.
These declarations do not establish the MHO-124 scale/storage verdict.

The Finance landing page opens on setup instructions with no fabricated totals.
It explicitly says no published dataset is connected; it does not infer zero
records. Synthetic examples require a deliberate button click. Existing native
rollups remain labeled fixture rollups and are not approved production metrics.
Financial accounts have a native table view and navigation entry. Existing
artifact/import/fact/coverage/exception objects and views remain in use.

## Bounded function

`prepare-finance-export` validates up to 2 MB / 10,000 CSV rows with explicitly
mapped account labels. It has no HTTP, cron, AI-tool or workflow trigger, reads
no Workspace records, returns aggregate validation metadata only, and writes
nothing. Existing default App role permissions remain unchanged. Invocation
and account bindings never grant record or import authority.

Profile `chatgpt-finances-posted-csv-v1` uses the supplied 12-column layout and
source-chat sign convention (positive outflow). It preserves source strings,
uses shared exact-money parsing, and rejects unknown accounts, malformed CSV,
unsupported dates/currencies/statuses/precision and duplicate account/IDs.
The preparation function hashes the supplied UTF-8 string; an acquisition layer
must retain original bytes and validate decoding before this hash can serve as
original Files custody. No complete-population claim follows from validation.

`projectPreparedExport` maps candidates to existing FinanceFact vocabulary.
It leaves legacy CURRENCY, artifact relation and revision unset until the writer
validates custody and existing history. Candidates remain UNCLASSIFIED and
excluded from authoritative totals. No hidden writes, auto-classification or
client data are embedded in application source.

## Installation and persistence work remaining

1. Identify the released target and authorized empty Workspace; review a native
   metadata plan before install/apply. No install or production change was made.
2. Bind account records and evidence Files under Twenty permissions. Preserve
   original bytes, acquisition history and explicit source/account authorization.
3. Connect the existing bounded importer to durable revision/checkpoint storage;
   enforce idempotency and permissions on the server. Reject changed prior
   observations instead of overwriting them.
4. Publish summaries through the shared snapshot contract. Connect the landing
   page and supported native widgets to the same authorized snapshot reads;
   expose partial/stale/failed/denied states and source trace links.
5. Prove installed relationships, permissions, retries, restart consistency and
   all visible states. MHO-124/146/227/228 acceptance remains open.

These are application integration tasks, not a requirement to obtain six years
of files before preparing the Workspace. Actual first-client onboarding retains
its recorded release and acceptance dependencies.
