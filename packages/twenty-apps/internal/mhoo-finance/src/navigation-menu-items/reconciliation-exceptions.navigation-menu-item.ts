import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { FINANCE_FOLDER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { RECONCILIATION_EXCEPTIONS_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/reconciliation-exceptions.view';
export default defineNavigationMenuItem({
  universalIdentifier: 'dad543fc-a183-4bbb-be44-060bb1a2e73c', name: 'Exceptions',
  icon: 'IconList', position: 6, type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: FINANCE_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: RECONCILIATION_EXCEPTIONS_VIEW_UNIVERSAL_IDENTIFIER,
});
