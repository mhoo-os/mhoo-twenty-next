# Browser-shell policy

The Mhoo distribution uses static Mhoo-safe HTML and manifest defaults so the
first browser frame cannot paint a Twenty title or icon. After the public
`/client-config` bootstrap succeeds, `brandState` updates the dynamic title and
product favicon from the complete resolved brand object. A failed or partial
bootstrap never replaces the last complete brand state.

Static shell assets are public files from the governed Mhoo asset manifest:

- favicon and Apple touch icon use the Mhoo favicon/iOS assets;
- the manifest uses Mhoo PWA, Android, and Windows icon variants;
- HTML, Open Graph, Twitter, application, and tile metadata use Mhoo values.

The browser shell does not select a workspace brand, use a foundation flag, or
create a second configuration authority. Workspace logos remain workspace
presentation and are not used as the product favicon.
