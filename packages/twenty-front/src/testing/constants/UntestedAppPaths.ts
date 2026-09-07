import { AppPath } from 'twenty-shared/types';

export const UNTESTED_APP_PATHS = [
  AppPath.Settings,
  AppPath.Developers,
  // Public, unauthenticated redirect route handled in useCreateWorkspaceAppRouter
  // — not part of the onboarding/auth page-change navigation matrix.
  AppPath.Dpa,
  // Public routes mounted by DomainShell before WorkspaceApp and its auth hook.
  // Each exact route is covered in DomainShell.test.tsx instead of this matrix.
  AppPath.LegalIndex,
  AppPath.LegalTerms,
  AppPath.LegalPrivacy,
  AppPath.LegalAcceptableUse,
  AppPath.LegalOpenSource,
  AppPath.LegalDpa,
];
