import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { FINANCE_FOLDER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { FINANCE_FACTS_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/finance-facts.view';
export default defineNavigationMenuItem({
  universalIdentifier: '46716e4c-62ed-4ee9-8e20-7c84327ecbaa', name: 'Transactions',
  icon: 'IconList', position: 3, type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: FINANCE_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: FINANCE_FACTS_VIEW_UNIVERSAL_IDENTIFIER,
});
