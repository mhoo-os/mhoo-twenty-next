import {
  MHO_BRAND,
  resolveWorkspacePresentation,
  type ProductBrand,
  type ResolvedBrand,
  type WorkspacePresentation,
} from 'twenty-shared/branding';

export type WorkspacePresentationBrand = ProductBrand | ResolvedBrand;

export type WorkspacePresentationSource = Readonly<{
  displayName?: string | null;
  logo?: string | null;
}>;

export const getWorkspacePresentation = (
  brand: WorkspacePresentationBrand | null | undefined,
  workspace?: WorkspacePresentationSource | null,
): WorkspacePresentation =>
  resolveWorkspacePresentation(
    brand ?? MHO_BRAND,
    workspace ? { kind: 'resolved-workspace', workspace } : { kind: 'global' },
  );
