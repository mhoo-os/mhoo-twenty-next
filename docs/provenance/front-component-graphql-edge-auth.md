# Native GraphQL edge authentication

ARCHITECTURE IMPACT: LOCAL

PR34 repairs host-owned JavaScript loading. Saved Finance sample reads use the
native CoreApiClient and worker host-fetch proxy, which independently omitted
cookies. A read-only request to the live metadata API with Twenty authorization
but an expired edge session returned302 to Cloudflare; refreshing the existing
edge session restored native SDK plan/apply. This supports the same edge
requirement for API requests, but is not a browser-rendered GraphQL proof.

The follow-up derives the exact GraphQL URL only from host-provided apiUrl.
It permits `credentials: same-origin` only for POST at that exact URL with an
explicit bearer header. Browsers omit cookies for a different origin, even if
the configured API lives there. Query-string variants, different paths, other
origins, missing bearer and other methods retain omit. Origin allowlisting is
checked first and POST redirects remain error. No cookie values enter the
worker, and Twenty still validates the bearer and user/App permissions.

Validation:107 renderer suites/645tests, strict renderer typecheck, source
custody and exact-path regression pass. The extended synthetic browser harness
passes authenticated GraphQL, missing edge login denial, cookie omission for
other paths/query variants/methods/missing bearer, and GraphQL redirect denial.
Existing component/SDK cross-origin cookie and Authorization leak checks also
pass. Reproduce with `node scripts/provenance/front-component-cookie-browser.cjs`
and its Run checks button. No real credentials or Workspace data are used.
No live image, Access policy or stored record change is part of this increment.
