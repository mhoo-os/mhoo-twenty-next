import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { FINANCE_FOLDER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { COVERAGE_PERIODS_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/coverage-periods.view';
export default defineNavigationMenuItem({
  universalIdentifier: '205761fb-2fec-46dd-a0c6-a7fef11d1e28', name: 'Coverage',
  icon: 'IconList', position: 5, type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: FINANCE_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: COVERAGE_PERIODS_VIEW_UNIVERSAL_IDENTIFIER,
});
