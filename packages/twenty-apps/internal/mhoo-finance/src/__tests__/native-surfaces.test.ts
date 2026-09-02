import { describe, expect, it } from 'vitest';

import application from 'src/application.config';
import financeDashboard from 'src/front-components/finance-audit-dashboard.front-component';
import financeNavigation from 'src/navigation-menu-items/finance-audit-dashboard.navigation-menu-item';
import financePageLayout from 'src/page-layouts/finance-audit-dashboard.page-layout';
import coveragePeriod from 'src/objects/coverage-period.object';
import financeFact from 'src/objects/finance-fact.object';
import importReceipt from 'src/objects/import-receipt.object';
import reconciliationException from 'src/objects/reconciliation-exception.object';
import sourceArtifact from 'src/objects/source-artifact.object';
import coveragePeriods from 'src/views/coverage-periods.view';
import financeFacts from 'src/views/finance-facts.view';
import importReceipts from 'src/views/import-receipts.view';
import reconciliationExceptions from 'src/views/reconciliation-exceptions.view';
import sourceArtifacts from 'src/views/source-artifacts.view';

describe('Mhoo Finance native surfaces', () => {
  it('declares the five native objects, five views, and dashboard surfaces', () => {
    const objects = [
      sourceArtifact,
      importReceipt,
      financeFact,
      coveragePeriod,
      reconciliationException,
    ];
    const views = [
      sourceArtifacts,
      importReceipts,
      financeFacts,
      coveragePeriods,
      reconciliationExceptions,
    ];

    expect(application.success).toBe(true);
    expect(objects.every((object) => object.success)).toBe(true);
    expect(views.every((view) => view.success)).toBe(true);
    expect(financeDashboard.success).toBe(true);
    expect(financePageLayout.success).toBe(true);
    expect(financeNavigation.success).toBe(true);
  });

  it('keeps native rollups bounded to the object graph and included facts', () => {
    const nativeRollups = financePageLayout.config?.tabs?.find(
      (tab) => tab.title === 'Native rollups',
    );
    const amountWidget = nativeRollups?.widgets?.find(
      (widget) => widget.title === 'Included amount by period',
    );

    expect(amountWidget?.configuration).toMatchObject({
      configurationType: 'AGGREGATE_CHART',
      filter: {
        recordFilters: [
          {
            operand: 'IS',
            value: 'true',
          },
        ],
      },
    });
    expect(financeNavigation.config).toMatchObject({
      name: 'Finance audit',
      type: 'PAGE_LAYOUT',
    });
  });
});
