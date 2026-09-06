import { describe, expect, it } from 'vitest';
import account from '../objects/financial-account.object';
import fact from '../objects/finance-fact.object';
import navigation from '../navigation-menu-items/financial-accounts.navigation-menu-item';
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
