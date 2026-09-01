# Workspace presentation policy

This policy separates global Mhoo product identity from workspace presentation.
The shared resolver consumes only an already-resolved context; it does not
resolve a host, workspace ID, token, membership, or domain.

| Flow | Workspace context | Product presentation | Workspace presentation |
| --- | --- | --- | --- |
| Global signup | Global/default domain; no workspace selected | Resolved Mhoo brand, including product assets, legal state, and attribution | Mhoo default workspace name and mark |
| Resolved workspace login | Existing domain resolver returned the workspace | Resolved Mhoo brand | That workspace's non-empty display name/logo, with Mhoo defaults per missing field |
| Invite or verification | Existing invite/token/domain flow returned the workspace | Resolved Mhoo brand | The returned workspace only; never a workspace named by request metadata |
| Workspace switcher | Existing authenticated membership and selected workspace | Mhoo product shell remains global | Selected workspace's existing name/logo; identifiers and routing stay authoritative elsewhere |
| Authenticated shell | Existing authenticated current workspace | Mhoo product shell remains global | Current authorized workspace's existing name/logo, with Mhoo defaults |
| Stable or custom host | Existing `WorkspaceDomainsService` resolution | Host shape cannot select a brand | Resolved workspace only; unresolved hosts render global Mhoo presentation |
| Wrong-origin token exchange | Existing origin/workspace agreement rejects or redirects | Global Mhoo presentation only while unresolved | No token/workspace presentation is adopted |
| Cross-workspace request | Existing JWT/session/membership authority selects the workspace | Mhoo product shell remains global | Only the selected workspace's data; no fallback may use another workspace |

Workspace metadata never overrides Mhoo legal identity, legal links, sender
identity, or attribution. The existing Twenty token, membership, origin, and
domain authorities remain unchanged.
