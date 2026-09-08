#!/usr/bin/env bash
set -euo pipefail
: "${TWENTY_IMAGE:?immutable GHCR digest required}"
: "${EXPECTED_APP_VERSION:?expected release version required}"
: "${EXPECTED_SOURCE_SHA:?full source SHA required}"
exec bash "$(dirname "$0")/mho255-acceptance.sh" \
  "$TWENTY_IMAGE" "$EXPECTED_APP_VERSION" "$EXPECTED_SOURCE_SHA" \
  "${MHO255_EVIDENCE_DIR:-work/mho255-evidence}"
