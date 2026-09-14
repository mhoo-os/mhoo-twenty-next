// The legacy single-Workspace setting remains valid during rollout. Each
// configured Workspace is still authenticated and authorized independently.
export const isCloverIntakeEnabledForWorkspace = (
  workspaceId: string,
  legacyWorkspaceId: string,
  workspaceIds: string,
): boolean => {
  if (!workspaceId) return false;

  return [legacyWorkspaceId, ...workspaceIds.split(',')]
    .map((id) => id.trim())
    .some((id) => id !== '' && id === workspaceId);
};
