export enum AppPath {
  // Not logged-in
  Verify = '/verify',
  VerifyEmail = '/verify-email',
  SignInUp = '/welcome',
  Invite = '/invite/:workspaceInviteHash',
  ResetPassword = '/reset-password/:passwordResetToken',

  // Public, hash-pinned Mhoo Legal Packet v2.0 routes.
  LegalIndex = '/legal',
  LegalTerms = '/legal/terms',
  LegalPrivacy = '/legal/privacy',
  LegalAcceptableUse = '/legal/acceptable-use',
  LegalOpenSource = '/legal/open-source',
  LegalDpa = '/legal/dpa',

  // Onboarding
  WorkspaceActivation = '/workspace-activation',
  CreateProfile = '/create/profile',
  SyncEmails = '/sync/emails',
  InstallApps = '/install-apps',
  InviteTeam = '/invite-team',
  PlanRequired = '/plan-required',
  PlanRequiredSuccess = '/plan-required/payment-success',
  BookCall = '/book-call',

  // Onboarded
  AiChat = '/chat/:threadId?',
  Index = '/',
  // Mobile only: the navigation menu is a page there rather than a drawer.
  Home = '/home',
  TasksPage = '/objects/tasks',
  OpportunitiesPage = '/objects/opportunities',

  RecordIndexPage = '/objects/:objectNamePlural',
  RecordShowPage = '/object/:objectNameSingular/:objectRecordId',
  PageLayoutPage = '/page/:pageLayoutId',
  WorkflowCoreIndexPage = '/workflow-core',

  Settings = `settings`,
  SettingsCatchAll = `/${Settings}/*`,
  Developers = `developers`,
  DevelopersCatchAll = `/${Developers}/*`,

  Authorize = '/authorize',

  // Deep link for twenty.com/dpa → in-app DPA generator (login-gated redirect).
  Dpa = '/dpa',

  // 404 page not found
  NotFoundWildcard = '*',
  NotFound = '/not-found',
}
