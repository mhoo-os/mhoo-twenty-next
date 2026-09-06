import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { FINANCE_FOLDER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { SOURCE_ARTIFACTS_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/source-artifacts.view';
export default defineNavigationMenuItem({
  universalIdentifier: '5b4ba56a-44c8-4587-a688-454c4b545829', name: 'Evidence',
  icon: 'IconList', position: 4, type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: FINANCE_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: SOURCE_ARTIFACTS_VIEW_UNIVERSAL_IDENTIFIER,
});
