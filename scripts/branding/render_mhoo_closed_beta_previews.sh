#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/../.." && pwd)"
output_directory="${MHOO_PREVIEW_OUTPUT:-/private/tmp/mhoo-mho233-preview-output}"

cd "$repository_root"

yarn workspace twenty-shared build
yarn workspace twenty-emails build

TSX_TSCONFIG_PATH=packages/twenty-emails/tsconfig.json \
  MHOO_PREVIEW_OUTPUT="$output_directory" \
  yarn tsx scripts/branding/render_mhoo_closed_beta_emails.tsx
TSX_TSCONFIG_PATH=packages/twenty-server/tsconfig.json \
  MHOO_PREVIEW_OUTPUT="$output_directory" \
  yarn tsx scripts/branding/render_mhoo_closed_beta_pages.ts

MHOO_PREVIEW_OUTPUT="$output_directory" \
  yarn tsx --test scripts/branding/mhoo_closed_beta_preview.test.ts

printf 'MHO-233 private preview written to %s\n' "$output_directory"
