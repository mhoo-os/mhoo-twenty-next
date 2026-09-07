import { describe, expect, it } from 'vitest';
import account from '../objects/financial-account.object';
import fact from '../objects/finance-fact.object';
import navigation from '../navigation-menu-items/financial-accounts.navigation-menu-item';
import dashboard from '../page-layouts/finance-audit-dashboard.page-layout';
import transactions from '../views/finance-facts.view';
import * as I from '../constants/universal-identifiers';

describe('workspace preparation', () => {
  it('declares both account/fact relation directions and account navigation', () => {
    expect(account.success).toBe(true);
    expect(fact.success).toBe(true);
    expect(navigation.success).toBe(true);
    expect(account.config?.fields?.find(f => f.name === 'facts')).toMatchObject({ relationTargetFieldMetadataUniversalIdentifier: I.FINANCE_FACT_ACCOUNT_FIELD_UNIVERSAL_IDENTIFIER });
    expect(fact.config?.fields?.find(f => f.name === 'financialAccount')).toMatchObject({ relationTargetFieldMetadataUniversalIdentifier: I.FINANCIAL_ACCOUNT_FACTS_FIELD_UNIVERSAL_IDENTIFIER });
  });
});

// A raw SUM would include excluded/superseded rows and cannot be a qualified financial metric.
describe('preparation dashboard financial limits', () => {
  it('uses record counts only until a qualified snapshot metric is connected', () => {
    const tabs = dashboard.config?.tabs ?? [];
    const graphs = tabs.flatMap(tab => tab.widgets ?? []).filter(widget => widget.type === 'GRAPH');
    expect(graphs).toHaveLength(4);
    for (const widget of graphs) expect(widget.configuration).toMatchObject({ aggregateOperation: 'COUNT' });
    expect(graphs.find(widget => widget.title === 'Unclassified records (count)')?.configuration).toMatchObject({
      filter: { recordFilters: [{ fieldMetadataUniversalIdentifier: I.FINANCE_FACT_CLASSIFICATION_FIELD_UNIVERSAL_IDENTIFIER, operand: 'IS', value: '["UNCLASSIFIED"]' }] },
    });
  });
});

// The live metadata validator requires the label identifier to be first and visible.
describe('native transaction view contract', () => {
  it('keeps the object label identifier visible at the lowest position', () => {
    const fields = transactions.config?.fields ?? [];
    const label = fields.find(field => field.fieldMetadataUniversalIdentifier === fact.config?.labelIdentifierFieldMetadataUniversalIdentifier);
    expect(label).toBeDefined();
    expect(label?.isVisible).toBe(true);
    expect(label?.position).toBe(Math.min(...fields.map(field => field.position)));
  });
});
