import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useResolvedBrand } from '@/client-config/hooks/useResolvedBrand';
import { getBrandUrl } from '@/client-config/utils/getBrandUrl';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isTwentyStandardApplication } from '@/applications/utils/isTwentyStandardApplication';
import { isWorkspaceCustomApplication } from '@/applications/utils/isWorkspaceCustomApplication';
import { getCustomApplicationDescription } from '~/pages/settings/applications/utils/getCustomApplicationDescription';
import { getStandardApplicationDescription } from '~/pages/settings/applications/utils/getStandardApplicationDescription';

type ApplicationLike = {
  id?: string | null;
  universalIdentifier?: string | null;
  description?: string | null;
};

export const useResolvedApplicationDescription = (
  application: ApplicationLike | null | undefined,
): string => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const brand = useResolvedBrand();
  const descriptionBrand = {
    productName: brand.productName,
    documentationUrl: getBrandUrl(brand, 'documentationUrl'),
  };

  if (isTwentyStandardApplication(application)) {
    return getStandardApplicationDescription(descriptionBrand);
  }

  if (isWorkspaceCustomApplication(application, currentWorkspace)) {
    return getCustomApplicationDescription(descriptionBrand);
  }

  return application?.description ?? '';
};
