import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import account from '../objects/financial-account.object';
import fact from '../objects/finance-fact.object';
import coverage from '../objects/coverage-period.object';
import overviewNavigation from '../navigation-menu-items/finance-audit-dashboard.navigation-menu-item';
import accountNavigation from '../navigation-menu-items/financial-accounts.navigation-menu-item';
import transactionNavigation from '../navigation-menu-items/finance-facts.navigation-menu-item';
import statementNavigation from '../navigation-menu-items/finance-statements.navigation-menu-item';
import followUpNavigation from '../navigation-menu-items/finance-follow-ups.navigation-menu-item';
import overviewLayout from '../page-layouts/finance-audit-dashboard.page-layout';
import accountLayout from '../page-layouts/finance-accounts.page-layout';
import transactionLayout from '../page-layouts/finance-transactions.page-layout';
import statementLayout from '../page-layouts/finance-statements.page-layout';
import followUpLayout from '../page-layouts/finance-follow-ups.page-layout';
import * as I from '../constants/universal-identifiers';

const frontComponentSource = readFileSync(
  new URL(
    '../front-components/finance-audit-dashboard.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const workspaceSource = readFileSync(
  new URL('../components/finance-workspace.tsx', import.meta.url),
  'utf8',
);

const frontComponentId = (layout: typeof overviewLayout) => {
  const configuration = layout.config?.tabs?.[0]?.widgets?.[0]?.configuration;
  return configuration?.configurationType === 'FRONT_COMPONENT'
    ? configuration.frontComponentUniversalIdentifier
    : undefined;
};

describe('native Finance workspace', () => {
  it('opens the Overview directly without obsolete setup or count tabs', () => {
    expect(frontComponentSource).toContain(
      'FinanceWorkspacePreparation = () => <FinanceWorkspace />',
    );
    expect(overviewLayout.config?.tabs).toHaveLength(1);
    expect(overviewLayout.config?.tabs?.[0]?.title).toBe('Overview');
    expect(frontComponentId(overviewLayout)).toBe(
      I.FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
    );
  });

  it('keeps the four core pages in order and adds the linked Follow-ups page', () => {
    const navigation = [
      overviewNavigation,
      accountNavigation,
      transactionNavigation,
      statementNavigation,
      followUpNavigation,
    ];
    expect(
      navigation.map((item) => ({
        name: item.config?.name,
        position: item.config?.position,
        type: item.config?.type,
      })),
    ).toEqual([
      { name: 'Overview', position: 1, type: 'PAGE_LAYOUT' },
      { name: 'Accounts', position: 2, type: 'PAGE_LAYOUT' },
      { name: 'Transactions', position: 3, type: 'PAGE_LAYOUT' },
      { name: 'Statements', position: 4, type: 'PAGE_LAYOUT' },
      { name: 'Follow-ups', position: 5, type: 'PAGE_LAYOUT' },
    ]);
    expect(accountNavigation.config?.pageLayoutUniversalIdentifier).toBe(
      I.FINANCE_ACCOUNTS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
    );
    expect(transactionNavigation.config?.pageLayoutUniversalIdentifier).toBe(
      I.FINANCE_TRANSACTIONS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
    );
    expect(statementNavigation.config?.pageLayoutUniversalIdentifier).toBe(
      I.FINANCE_STATEMENTS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
    );
    expect(followUpNavigation.config?.pageLayoutUniversalIdentifier).toBe(
      I.FINANCE_FOLLOW_UPS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
    );
  });

  it('renders each native destination through its designed Finance component', () => {
    expect(frontComponentId(accountLayout as typeof overviewLayout)).toBe(
      I.FINANCE_ACCOUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
    );
    expect(frontComponentId(transactionLayout as typeof overviewLayout)).toBe(
      I.FINANCE_TRANSACTIONS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
    );
    expect(frontComponentId(statementLayout as typeof overviewLayout)).toBe(
      I.FINANCE_STATEMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
    );
    expect(frontComponentId(followUpLayout as typeof overviewLayout)).toBe(
      I.FINANCE_FOLLOW_UPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
    );
  });

  it('uses Twenty theme tokens and no duplicate embedded shell navigation', () => {
    expect(workspaceSource).toContain(
      "'--fw-text': 'var(--t-font-color-primary)'",
    );
    expect(workspaceSource).toContain("fontFamily: 'var(--t-font-family)'");
    expect(workspaceSource).not.toContain('<header className="fw-chrome">');
    expect(workspaceSource).not.toContain('<nav className="fw-nav"');
    expect(workspaceSource).toContain("dataSource = 'workspace'");
    expect(workspaceSource).toContain('No demo data was substituted');
    expect(workspaceSource).toContain('Native Twenty Task');
    expect(workspaceSource).toContain('Approve draft · do not send');
    expect(workspaceSource).toContain(
      'explicit supported source currency is present, values display',
    );
    expect(workspaceSource).toContain(
      'otherwise the exact minor-unit text remains',
    );
    expect(workspaceSource).not.toContain(
      'no money\n                display is inferred',
    );
    expect(workspaceSource).toContain('fw-table fw-statements-table');
    expect(workspaceSource).toContain(
      "'& .fw-statements-table th:nth-child(2), & .fw-statements-table td:nth-child(2)': {",
    );
    expect(workspaceSource).toContain("width: '19%'");
    expect(workspaceSource).toContain('Statement import coverage');
    expect(workspaceSource).toContain(
      'imported statement rows · classification pending',
    );
    expect(workspaceSource).toContain(
      'Source coverage is not revenue, profit, or qualified cash movement.',
    );
    expect(workspaceSource).toContain(
      'Classification pending · qualified totals and chart withheld',
    );
  });

  it('retains both account/fact relation directions without exposing raw tables as primary navigation', () => {
    expect(account.success).toBe(true);
    expect(fact.success).toBe(true);
    expect(
      account.config?.fields?.find((field) => field.name === 'facts'),
    ).toMatchObject({
      relationTargetFieldMetadataUniversalIdentifier:
        I.FINANCE_FACT_ACCOUNT_FIELD_UNIVERSAL_IDENTIFIER,
    });
    expect(
      fact.config?.fields?.find((field) => field.name === 'financialAccount'),
    ).toMatchObject({
      relationTargetFieldMetadataUniversalIdentifier:
        I.FINANCIAL_ACCOUNT_FACTS_FIELD_UNIVERSAL_IDENTIFIER,
    });
  });

  it('stores validated completeness proof separately from the legacy coverage badge', () => {
    expect(coverage.success).toBe(true);
    expect(
      coverage.config?.fields?.find(
        (field) => field.name === 'completenessReceipt',
      ),
    ).toMatchObject({
      universalIdentifier:
        I.COVERAGE_PERIOD_COMPLETENESS_RECEIPT_FIELD_UNIVERSAL_IDENTIFIER,
      type: 'TEXT',
      isNullable: true,
    });
  });
});
