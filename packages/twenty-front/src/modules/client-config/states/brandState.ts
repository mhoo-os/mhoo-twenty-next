import { type ResolvedBrand } from 'twenty-shared/branding';

import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const brandState = createAtomState<ResolvedBrand | null>({
  key: 'brand',
  defaultValue: null,
});
