import { type ProductBrand } from './brand.types';

type ProductPresentationSource = Pick<ProductBrand, 'productName' | 'assets'>;

export type WorkspacePresentationContext =
  | Readonly<{
      kind: 'global';
    }>
  | Readonly<{
      kind: 'resolved-workspace';
      workspace: Readonly<{
        displayName?: string | null;
        logo?: string | null;
      }>;
    }>;

export type WorkspacePresentation = Readonly<{
  product: ProductPresentationSource;
  workspace: Readonly<{
    name: string;
    logoUrl: string;
    logoAltText: string;
    isResolved: boolean;
  }>;
}>;

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Resolve presentation only from an already-authorized workspace context.
 * This function deliberately does not resolve hosts, IDs, tokens, or domains.
 */
export const resolveWorkspacePresentation = (
  brand: ProductPresentationSource,
  context: WorkspacePresentationContext,
): WorkspacePresentation => {
  const isResolvedWorkspace = context.kind === 'resolved-workspace';
  const workspaceName =
    isResolvedWorkspace && isNonEmptyString(context.workspace.displayName)
      ? context.workspace.displayName.trim()
      : brand.productName;
  const workspaceLogoUrl =
    isResolvedWorkspace && isNonEmptyString(context.workspace.logo)
      ? context.workspace.logo
      : brand.assets.workspaceDefault.path;
  const workspaceLogoAltText =
    isResolvedWorkspace && isNonEmptyString(context.workspace.logo)
      ? `${workspaceName} workspace logo`
      : `${brand.productName} default workspace logo`;

  return Object.freeze({
    product: brand,
    workspace: Object.freeze({
      name: workspaceName,
      logoUrl: workspaceLogoUrl,
      logoAltText: workspaceLogoAltText,
      isResolved: isResolvedWorkspace,
    }),
  });
};
