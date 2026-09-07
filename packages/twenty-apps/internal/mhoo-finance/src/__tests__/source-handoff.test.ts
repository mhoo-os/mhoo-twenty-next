import { describe, expect, it, vi } from 'vitest';
import { AppPath } from 'twenty-sdk/front-component';
import { handoffSource } from '../investigation/source-handoff';

describe('native source handoff', () => {
  it('hands off only to the native current-workspace Apps catalog', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined);
    expect(await handoffSource('apps', navigate)).toBe('handed-off');
    expect(navigate).toHaveBeenCalledExactlyOnceWith(AppPath.SettingsCatchAll, { '*': 'applications' });
  });
  it.each(['statement', 'csv'] as const)('does not navigate or import unsupported %s input', async entry => {
    const navigate = vi.fn();
    expect(await handoffSource(entry, navigate)).toBe('unavailable');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('does not report connection success or broaden navigation when the host rejects', async () => {
    const navigate = vi.fn().mockRejectedValue(new Error('denied'));
    expect(await handoffSource('apps', navigate)).toBe('failed');
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
