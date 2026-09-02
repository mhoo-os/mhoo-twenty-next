import { defineView, ViewType } from 'twenty-sdk/define';

import {
  FINANCE_FACT_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_CLASSIFICATION_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_INCLUDED_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_PERIOD_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_REVISION_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_SOURCE_ROW_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export const FINANCE_FACTS_VIEW_UNIVERSAL_IDENTIFIER =
  'e9e1d2f3-a4b5-4678-9012-3456789abf01';

export default defineView({
  universalIdentifier: FINANCE_FACTS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Normalized finance facts',
  objectUniversalIdentifier: FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconCurrencyDollar',
  position: 0,
  fields: [
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf11', fieldMetadataUniversalIdentifier: FINANCE_FACT_KEY_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf12', fieldMetadataUniversalIdentifier: FINANCE_FACT_SOURCE_ROW_FIELD_UNIVERSAL_IDENTIFIER, position: 1, isVisible: true, size: 220 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf13', fieldMetadataUniversalIdentifier: FINANCE_FACT_PERIOD_FIELD_UNIVERSAL_IDENTIFIER, position: 2, isVisible: true, size: 100 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf14', fieldMetadataUniversalIdentifier: FINANCE_FACT_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER, position: 3, isVisible: true, size: 130 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf15', fieldMetadataUniversalIdentifier: FINANCE_FACT_CLASSIFICATION_FIELD_UNIVERSAL_IDENTIFIER, position: 4, isVisible: true, size: 170 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf16', fieldMetadataUniversalIdentifier: FINANCE_FACT_STATUS_FIELD_UNIVERSAL_IDENTIFIER, position: 5, isVisible: true, size: 120 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf17', fieldMetadataUniversalIdentifier: FINANCE_FACT_REVISION_FIELD_UNIVERSAL_IDENTIFIER, position: 6, isVisible: true, size: 100 },
    { universalIdentifier: 'e9e1d2f3-a4b5-4678-9012-3456789abf18', fieldMetadataUniversalIdentifier: FINANCE_FACT_INCLUDED_FIELD_UNIVERSAL_IDENTIFIER, position: 7, isVisible: true, size: 130 },
  ],
});
