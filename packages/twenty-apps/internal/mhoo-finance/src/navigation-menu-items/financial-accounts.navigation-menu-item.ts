import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import * as I from 'src/constants/universal-identifiers';
export default defineNavigationMenuItem({
  universalIdentifier: I.FINANCIAL_ACCOUNT_NAV_UNIVERSAL_IDENTIFIER,
  name: 'Financial accounts',
  icon: 'IconBuildingBank',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier:
    I.FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
});
