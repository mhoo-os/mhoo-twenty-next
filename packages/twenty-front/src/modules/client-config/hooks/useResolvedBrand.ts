import {
  MHO_BRAND,
  type ProductBrand,
  type ResolvedBrand,
} from 'twenty-shared/branding';

import { brandState } from '@/client-config/states/brandState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export type ClientBrand = ProductBrand | ResolvedBrand;

export const useResolvedBrand = (): ClientBrand =>
  useAtomStateValue(brandState) ?? MHO_BRAND;
