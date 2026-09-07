# Clover native integration

Standalone native Twenty App. Twenty owns identity, Workspace permissions,
ConnectedAccount encryption, generated APIs and function execution. Clover owns
provider lifecycle and observations. Finance owns its financial interpretation.

Phase one: manual read-only intake, merchant identity read, native disconnect
and a secret-free Clover-owned merchant observation. No payment/order/employee
data, provider writes, background activation or arbitrary provider URL.

## Data contract merchant-v1

App: `813784c7-5dc1-438c-badb-012ab73483c2`.
Object: `27e1bebd-b3f0-462a-acf5-352879f11c5d`,
`cloverMerchantObservation` / `cloverMerchantObservations`.
Native record ID identifies each observation. Fields: merchantId, merchantName,
observedAt (server UTC), sourceRevision (`merchant-v1`, schema version, not a
provider revision), sourcePath, scopeVerification (`unknown`). No credentials,
provider raw body, amount, currency, account mapping or original artifact.
This is merchant context, not transaction evidence or financial coverage.

Producer uses fixed provider GET and native REST write with delegated user
identity. Native user + Clover App permissions must allow both connection
access and observation creation. Native create/update permission is combined;
the producer appends but storage is not immutable/WORM. UI editing is disabled.
No consumer is allowed access merely by supplying App, merchant or Workspace ID.

Consumers declare READ on this installed object's universal ID in their own
roles, use native APIs with delegated identity, and receive the user/consumer
permission intersection. Do not invoke another App's credential helper or a
general function executor. Missing metadata/provider means unavailable; never
substitute an empty financial dataset. No automatic dependency install exists
in the inspected manifest. Install Clover before a role references the object.
Finance PR36 remains unchanged until a relevant finance data contract exists.

Disconnect removes the native account and denies further reads. Historical
observations remain; provider token revocation is separate in Clover. Uninstall
uses native destructive App lifecycle; no survival of Clover data is promised,
and no cross-App uninstall block is claimed. Consumers must preserve their own
approved derived evidence and handle absent producer data. No cascade relation
from Finance to this object is introduced.

## Delivery limits

Source and synthetic proof only. Read/observe functions have no public, cron,
workflow or MCP trigger. UI intake uses the existing native Settings surface.
No live App install, signed-session/executor integration proof, data permission
HTTP runtime proof, real provider scope verification, immutable artifact, or
customer activation follows from unit tests. Financial ingestion is a later
phase requiring its own amount/currency/sign/revision/lineage contract.

Existing accounts are never relabeled. Finance-bound first-slice accounts
require explicit inventory and approved reconnect/migration if installed.
