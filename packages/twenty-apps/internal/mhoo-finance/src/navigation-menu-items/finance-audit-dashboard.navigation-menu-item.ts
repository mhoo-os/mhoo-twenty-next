import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  FINANCE_AUDIT_DASHBOARD_NAVIGATION_UNIVERSAL_IDENTIFIER,
  FINANCE_AUDIT_DASHBOARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: FINANCE_AUDIT_DASHBOARD_NAVIGATION_UNIVERSAL_IDENTIFIER,
  name: 'Finance audit',
  icon: 'IconDashboard',
  position: 1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier:
    FINANCE_AUDIT_DASHBOARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
