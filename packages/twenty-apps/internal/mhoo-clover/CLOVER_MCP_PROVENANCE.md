# Native read catalog provenance

The bounded Clover read catalog in `src/clover-read/` is adapted from
`mhoo-os/clover-mcp` commit
`7590cf450845407d661f7725adb700b548905992`:

- `src/catalog.ts`: fixed GET-only provider routes and strict input schemas.
- `src/output.ts` and `src/redact.ts`: response allowlists and secret redaction.
- `src/client.ts`: adapted for Twenty's native delegated connection rather than
  the Worker OAuth connection, Cloudflare Access, or D1 audit layers.

This App deliberately does not import the standalone Worker’s OAuth,
Cloudflare Access, D1, encrypted credential store, or global connection model.
Twenty resolves the selected `clover-manual` connection as the invoking
Workspace member; the token remains in that native connection.
