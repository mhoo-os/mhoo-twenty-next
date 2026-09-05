import {
  AggregateOperations,
  definePageLayout,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import {
  COVERAGE_PERIOD_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  COVERAGE_PERIOD_OBJECT_UNIVERSAL_IDENTIFIER,
  COVERAGE_PERIOD_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  FINANCE_AUDIT_DASHBOARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_CLASSIFICATION_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  RECONCILIATION_EXCEPTION_DIFFERENCE_FIELD_UNIVERSAL_IDENTIFIER,
  RECONCILIATION_EXCEPTION_OBJECT_UNIVERSAL_IDENTIFIER,
  RECONCILIATION_EXCEPTION_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: FINANCE_AUDIT_DASHBOARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Finance audit dashboard',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf11',
      title: 'Audit overview',
      position: 0,
      icon: 'IconDashboard',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf12',
          title: 'Fixture audit dashboard',
          type: 'FRONT_COMPONENT',
          position: { layoutMode: PageLayoutTabLayoutMode.CANVAS },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
    {
      universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf13',
      title: 'Native rollups',
      position: 50,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf14',
          title: 'Coverage by status',
          type: 'GRAPH',
          objectUniversalIdentifier: COVERAGE_PERIOD_OBJECT_UNIVERSAL_IDENTIFIER,
          position: { layoutMode: PageLayoutTabLayoutMode.GRID, row: 0, column: 0, rowSpan: 5, columnSpan: 6 },
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier: COVERAGE_PERIOD_KEY_FIELD_UNIVERSAL_IDENTIFIER,
            aggregateOperation: AggregateOperations.COUNT,
            groupByFieldMetadataUniversalIdentifier: COVERAGE_PERIOD_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
            displayLegend: true,
            timezone: 'UTC',
            firstDayOfTheWeek: 1,
          },
        },
        {
          universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf15',
          title: 'Open exception difference',
          type: 'GRAPH',
          objectUniversalIdentifier: RECONCILIATION_EXCEPTION_OBJECT_UNIVERSAL_IDENTIFIER,
          position: { layoutMode: PageLayoutTabLayoutMode.GRID, row: 0, column: 6, rowSpan: 5, columnSpan: 6 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: RECONCILIATION_EXCEPTION_DIFFERENCE_FIELD_UNIVERSAL_IDENTIFIER,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            timezone: 'UTC',
            firstDayOfTheWeek: 1,
            filter: {
              recordFilters: [
                {
                  fieldMetadataUniversalIdentifier: RECONCILIATION_EXCEPTION_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
                  operand: 'IS',
                  value: '["OPEN"]',
                },
              ],
            },
          },
        },
        {
          universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf16',
          title: 'Facts by classification',
          type: 'GRAPH',
          objectUniversalIdentifier: FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
          position: { layoutMode: PageLayoutTabLayoutMode.GRID, row: 5, column: 0, rowSpan: 5, columnSpan: 12 },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier: FINANCE_FACT_KEY_FIELD_UNIVERSAL_IDENTIFIER,
            aggregateOperation: AggregateOperations.COUNT,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: FINANCE_FACT_CLASSIFICATION_FIELD_UNIVERSAL_IDENTIFIER,
            layout: 'VERTICAL',
            primaryAxisOrderBy: 'VALUE_DESC',
            axisNameDisplay: 'NONE',
            color: 'auto',
            timezone: 'UTC',
            firstDayOfTheWeek: 1,
          },
        },
        {
          universalIdentifier: 'b9e1d2f3-a4b5-4678-9012-3456789abf17',
          title: 'Included amount by period',
          type: 'GRAPH',
          objectUniversalIdentifier: FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
          position: { layoutMode: PageLayoutTabLayoutMode.GRID, row: 10, column: 0, rowSpan: 5, columnSpan: 12 },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: FINANCE_FACT_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            timezone: 'UTC',
            firstDayOfTheWeek: 1,
          },
        },
      ],
    },
  ],
});
