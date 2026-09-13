# Default-off same-origin Workspace source proof

ARCHITECTURE IMPACT: CROSS-SYSTEM

Accepted ADR-0014 source scope. `IS_SAME_ORIGIN_WORKSPACE_ENABLED` defaults false
and only takes effect with native multi-Workspace mode. It keeps Workspace URLs
on the configured frontend origin; verified native login-token Workspace ID
selects the candidate. Native email, membership, MFA and token checks remain.
The origin or Workspace selector does not grant membership.

After exchange the frontend clears persisted native Workspace/user context and
Apollo state, broadcasts invalidation without identity or credentials, and
reloads. Other tabs reload rather than signing out the replacement session.
Existing upstream domain behavior remains when the flag is off.

Six isolated native integration tests pass: two seeded Workspaces exchange
signed login tokens on one origin; forged payload, wrong origin, absent
membership, native MFA, expired token and wrong token type deny; default-off
URLs remain unchanged. The fixture selects real native WorkspaceMember records,
not merely userWorkspace rows, and preserves seeded MFA accounts for denial.

Additional proof: 18 auth/MFA resolver tests, 8 existing frontend auth tests,
2 cross-tab tests, full frontend/server tsgo and changed-source lint. Tests use
the dedicated native synthetic harness described in clover-native-runtime-proof.md.
No production configuration was enabled. The suite uses a temporary config
spy, native signing service, HTTP auth exchange and real database memberships.

Not proven: full browser signup/invitation journey, cross-tab visual E2E,
complete same-user multi-Workspace MFA/OTP switching, cookie replacement across
browsers, session recovery or production activation. This does not enable the
public onboarding CTA. Cloudflare remains an entry guide, not identity authority.
