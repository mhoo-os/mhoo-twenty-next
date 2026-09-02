import { MHO_BRAND, TWENTY_BRAND } from 'twenty-shared/branding';

import { getWorkspacePresentation } from '@/workspace/utils/getWorkspacePresentation';

describe('getWorkspacePresentation', () => {
  it('uses Mhoo defaults before client configuration is loaded', () => {
    const presentation = getWorkspacePresentation(null);

    expect(presentation.workspace.name).toBe('Mhoo');
    expect(presentation.workspace.logoUrl).toBe(
      MHO_BRAND.assets.workspaceDefault.path,
    );
    expect(presentation.workspace.isResolved).toBe(false);
  });

  it('keeps an authorized workspace name and logo', () => {
    const presentation = getWorkspacePresentation(TWENTY_BRAND, {
      displayName: 'Client workspace',
      logo: 'https://cdn.example.test/workspace.png',
    });

    expect(presentation.workspace).toMatchObject({
      name: 'Client workspace',
      logoUrl: 'https://cdn.example.test/workspace.png',
      isResolved: true,
    });
  });

  it('uses the selected brand defaults only for missing workspace fields', () => {
    const presentation = getWorkspacePresentation(TWENTY_BRAND, {
      displayName: '   ',
      logo: null,
    });

    expect(presentation.workspace.name).toBe('Twenty');
    expect(presentation.workspace.logoUrl).toBe(
      TWENTY_BRAND.assets.workspaceDefault.path,
    );
    expect(presentation.workspace.logoAltText).toBe(
      'Twenty default workspace logo',
    );
  });
});
