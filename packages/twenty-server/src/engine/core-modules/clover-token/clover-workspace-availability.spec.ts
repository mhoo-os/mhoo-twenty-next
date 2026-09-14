import { isCloverIntakeEnabledForWorkspace } from './clover-workspace-availability';

describe('Clover Workspace availability', () => {
  const hass = '11111111-1111-4111-8111-111111111111';
  const mhoo = '22222222-2222-4222-8222-222222222222';
  const unrelated = '33333333-3333-4333-8333-333333333333';

  it('keeps the legacy single-Workspace setting working', () => {
    expect(isCloverIntakeEnabledForWorkspace(hass, hass, '')).toBe(true);
    expect(isCloverIntakeEnabledForWorkspace(mhoo, hass, '')).toBe(false);
  });

  it('allows independently listed Workspaces with exact matching', () => {
    expect(
      isCloverIntakeEnabledForWorkspace(hass, '', ` ${hass}, ${mhoo} `),
    ).toBe(true);
    expect(
      isCloverIntakeEnabledForWorkspace(mhoo, '', ` ${hass}, ${mhoo} `),
    ).toBe(true);
    expect(
      isCloverIntakeEnabledForWorkspace(unrelated, '', `${hass},${mhoo}`),
    ).toBe(false);
    expect(isCloverIntakeEnabledForWorkspace(hass.slice(0, -1), '', hass)).toBe(
      false,
    );
  });

  it('fails closed when no Workspace is configured', () => {
    expect(isCloverIntakeEnabledForWorkspace('', '', '')).toBe(false);
    expect(isCloverIntakeEnabledForWorkspace(hass, '', ' , ')).toBe(false);
  });
});
