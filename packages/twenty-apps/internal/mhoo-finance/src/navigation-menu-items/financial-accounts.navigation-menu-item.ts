import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import * as I from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  folderUniversalIdentifier: I.FINANCE_FOLDER_UNIVERSAL_IDENTIFIER,
  universalIdentifier: I.FINANCIAL_ACCOUNT_NAV_UNIVERSAL_IDENTIFIER,
  name: 'Accounts',
  icon: 'IconBuildingBank',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier:
    I.FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
});
