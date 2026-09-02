import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  FinanceAuditDashboard,
  PREVIEW_STATES,
  type FinanceAuditDashboardProps,
} from 'src/front-components/finance-audit-dashboard.front-component';
import { FIXTURE_GENERATED_AT } from 'src/fixtures/fixture-pack';

const stateMarkers: Record<string, string> = {
  populated: 'What is covered?',
  loading: 'Loading source receipts',
  empty: 'No authorized fixture records',
  partial: 'Partial fixture view',
  stale: 'Stale fixture view',
  failed: 'The fixture read failed closed',
  denied: 'Access denied',
};

const renderDashboard = (
  value: (typeof PREVIEW_STATES)[number]['value'],
): string =>
  renderToStaticMarkup(
    createElement<FinanceAuditDashboardProps>(
      FinanceAuditDashboard,
      {
        initialPreviewState: value,
        showTraceInitially: value === 'populated',
      },
    ),
  );

describe('Mhoo Finance rendered-state evidence', () => {
  it('renders every documented state and writes a deterministic local receipt', () => {
    const renderedStates = PREVIEW_STATES.map(({ value }) => {
      const html = renderDashboard(value);

      expect(html).toContain(stateMarkers[value]);

      return {
        state: value,
        htmlLength: html.length,
        htmlSha256: createHash('sha256').update(html).digest('hex'),
      };
    });

    const renderedDocument = [
      '<!doctype html>',
      '<html><head><meta charset="utf-8"><title>Mhoo Finance rendered states</title>',
      '<style>body{margin:0;background:#eef2f6;font-family:system-ui,sans-serif}section{margin:24px auto;max-width:1100px}</style>',
      '</head><body>',
      ...PREVIEW_STATES.map(({ value }) => {
        const html = renderDashboard(value);
        return `<section data-preview-state="${value}"><h2>${value}</h2>${html}</section>`;
      }),
      '</body></html>',
    ].join('');

    const evidenceDirectory = resolve(process.cwd(), 'evidence');
    mkdirSync(evidenceDirectory, { recursive: true });
    writeFileSync(
      resolve(evidenceDirectory, 'rendered-states.html'),
      renderedDocument,
      'utf8',
    );
    writeFileSync(
      resolve(evidenceDirectory, 'rendered-state-receipt.json'),
      `${JSON.stringify(
        {
          generatedAt: FIXTURE_GENERATED_AT,
          source: 'src/__tests__/rendered-state-receipt.test.ts',
          states: renderedStates,
          documentSha256: createHash('sha256')
            .update(renderedDocument)
            .digest('hex'),
          liveWorkspaceProof: 'NOT_CLAIMED',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(renderedStates).toHaveLength(7);
    expect(renderedDocument).toContain('data-preview-state="denied"');
  });
});
