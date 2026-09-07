import { AppPath, navigate } from 'twenty-sdk/front-component';

export type SourceEntry = 'apps' | 'statement' | 'csv';
export type HandoffResult = 'handed-off' | 'unavailable' | 'failed';

// Discovery and connection authorization remain on Twenty's native Apps page.
// A completed navigation is not evidence of an installed or connected provider.
export const handoffSource = async (
  entry: SourceEntry,
  hostNavigate: typeof navigate = navigate,
): Promise<HandoffResult> => {
  if (entry !== 'apps') return 'unavailable';
  try {
    await hostNavigate(AppPath.SettingsCatchAll, { '*': 'applications' });
    return 'handed-off';
  } catch {
    return 'failed';
  }
};
