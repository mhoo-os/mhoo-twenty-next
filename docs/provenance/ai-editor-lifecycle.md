# AI instructions editor lifecycle repair

ARCHITECTURE IMPACT: LOCAL

The September 7 console exception from `/settings/ai` reads
`Cannot read properties of null (reading 'extensions')`. Exact deployed source
`22da85231e89c1d62fcc05a6b1cfa645f305607b` maps the stack to
`hasEditorExtension`, the `useTurnIntoBlockOptions` selector and
`TurnIntoBlockDropdown`. The deployed index asset checksum is
`4d5584b9f8445da3d827782111287fbb31f17875530f503c2e765efc191bc45e`.

The pinned Tiptap core/react version is 3.30.2. Its `Editor.destroy()` clears
`extensionManager`. Its `useEditorState` snapshot can still reference the prior
editor during replacement. Reading that snapshot's extension manager crashes.
The real user transition initiating the exception has not been isolated; this
source repair does not claim a browser-specific or backend cause.

The extension lookup now returns false for missing/destroyed editors. The block
selector reads the current editor prop rather than the cached prior instance,
and returns no options if the current editor is unavailable or destroyed.
This avoids both the null extension lookup and callbacks against the old
editor. It preserves normal paragraph/heading actions without changing the
editor dependency or introducing a new lifecycle abstraction.

## Verification

Using the pinned Tiptap implementation and real React selector hook, three
regressions fail on the original code with the same null `extensions` error:
lookup after destroy, a destroyed selector snapshot, and editor replacement.
The repaired tests additionally cover missing-to-live-to-missing transitions,
active paragraph/heading actions, and the actual AI instructions profile with
`useAdvancedTextEditor` switching inline/fullscreen dependencies twice.

Run the native frontend Jest configuration against the advanced-text-editor
module. Source custody and exact-path fixture tests retain the enumerated
repair boundary. Local checks and hosted CI are source evidence only.

## Boundaries

This is a generally useful shared frontend correctness fix, suitable for an
upstream contribution. No Finance App source or records, AI settings,
credentials, dependency versions, Cloudflare policy, manifest/CORS behavior,
server code or deployment configuration changes. Production acceptance requires
separate release authorization and verification after deployment.
