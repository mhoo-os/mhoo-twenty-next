import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
export const isSameOriginWorkspaceEnabledState = createAtomState<boolean>({
  key: 'isSameOriginWorkspaceEnabledState',
  defaultValue: false,
});
