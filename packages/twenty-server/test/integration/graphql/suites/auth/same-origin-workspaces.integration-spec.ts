import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { type LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { type WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { getAuthTokensFromLoginTokenQueryFactory } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.query-factory.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

const isolated = new URL(process.env.PG_DATABASE_URL!);
if (
  isolated.hostname !== '127.0.0.1' ||
  isolated.port !== '55441' ||
  isolated.pathname !== '/clover_native_synthetic'
)
  throw new Error('Dedicated Clover synthetic database required');
const origin = 'http://localhost:3001';
let login: LoginTokenService;
let jwt: JwtWrapperService;
let domains: WorkspaceDomainsService;
let members: { email: string; workspaceId: string; subdomain: string }[];
const exchange = (token: string, atOrigin = origin) =>
  makeMetadataAPIRequest(
    getAuthTokensFromLoginTokenQueryFactory({
      loginToken: token,
      origin: atOrigin,
    }),
    null,
  ).set('Origin', atOrigin);

describe('same-origin Workspace exchange through native signature and membership', () => {
  beforeAll(async () => {
    jest.useRealTimers();
    const config = getAppProviderByClassName<TwentyConfigService>(
      'TwentyConfigService',
    );
    const originalGet = config.get.bind(config);
    jest
      .spyOn(config, 'get')
      .mockImplementation(((key: string) =>
        key === 'IS_SAME_ORIGIN_WORKSPACE_ENABLED'
          ? true
          : originalGet(key as never)) as never);
    login = getAppProviderByClassName<LoginTokenService>('LoginTokenService');
    jwt = getAppProviderByClassName<JwtWrapperService>('JwtWrapperService');
    domains = getAppProviderByClassName<WorkspaceDomainsService>(
      'WorkspaceDomainsService',
    );
    members = [];
    const workspaces = await globalThis.testDataSource.query(
      'SELECT id, subdomain, "databaseSchema" FROM core.workspace',
    );
    for (const workspace of workspaces) {
      if (!/^workspace_[a-z0-9]+$/.test(workspace.databaseSchema))
        throw new Error('Invalid synthetic schema');
      const [member] = await globalThis.testDataSource.query(
        `SELECT u.email, uw."workspaceId" FROM core."userWorkspace" uw JOIN core."user" u ON u.id=uw."userId" JOIN "${workspace.databaseSchema}"."workspaceMember" wm ON wm."userId"=u.id WHERE uw."workspaceId"=$1 AND u."isEmailVerified"=true AND wm."deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM core."twoFactorAuthenticationMethod" m WHERE m."userWorkspaceId"=uw.id) ORDER BY u.email LIMIT 1`,
        [workspace.id],
      );
      expect(member).toBeDefined();
      members.push({ ...member, subdomain: workspace.subdomain });
    }
    expect(members).toHaveLength(2);
  });
  afterAll(() => jest.restoreAllMocks());
  it('exchanges signed tokens for both seeded Workspaces on the same canonical origin', async () => {
    for (const member of members) {
      const token = await login.generateLoginToken(
        member.email,
        member.workspaceId,
        AuthProviderEnum.Password,
      );
      const response = await exchange(token.token);
      expect(response.body.errors).toBeUndefined();
      const access =
        response.body.data.getAuthTokensFromLoginToken.tokens
          .accessOrWorkspaceAgnosticToken.token;
      await jwt.verifyJwtToken(access);
      expect(jwt.decode<{ workspaceId: string }>(access).workspaceId).toBe(
        member.workspaceId,
      );
      expect(
        domains.getWorkspaceUrls({
          subdomain: member.subdomain,
          customDomain: 'unused.invalid',
          isCustomDomainEnabled: true,
        }),
      ).toEqual({ subdomainUrl: `${origin}/`, customUrl: undefined });
    }
  });
  it('rejects a tampered signature and noncanonical origin before token issuance', async () => {
    const token = await login.generateLoginToken(
      members[0].email,
      members[0].workspaceId,
      AuthProviderEnum.Password,
    );
    const parts = token.token.split('.');
    parts[1] = Buffer.from(
      JSON.stringify({
        ...jwt.decode(token.token),
        workspaceId: members[1].workspaceId,
      }),
    ).toString('base64url');
    expect(
      (await exchange(parts.join('.'))).body.errors?.length,
    ).toBeGreaterThan(0);
    expect(
      (await exchange(token.token, 'http://attacker.invalid')).body.errors
        ?.length,
    ).toBeGreaterThan(0);
  });
  it('rejects a validly signed token for a Workspace the user does not belong to', async () => {
    const missing = await globalThis.testDataSource.query(
      'SELECT u.email, w.id AS "workspaceId" FROM core."user" u CROSS JOIN core.workspace w WHERE NOT EXISTS (SELECT 1 FROM core."userWorkspace" uw WHERE uw."userId"=u.id AND uw."workspaceId"=w.id) AND u."isEmailVerified"=true LIMIT 1',
    );
    expect(missing).toHaveLength(1);
    const token = await login.generateLoginToken(
      missing[0].email,
      missing[0].workspaceId,
      AuthProviderEnum.Password,
    );
    expect((await exchange(token.token)).body.errors?.length).toBeGreaterThan(
      0,
    );
  });
  it('retains native MFA denial on the canonical origin', async () => {
    const token = await login.generateLoginToken(
      'jane.austen@apple.dev',
      '20202020-1c25-4d02-bf25-6aeccf7ea419',
      AuthProviderEnum.Password,
    );
    const response = await exchange(token.token);
    expect(
      response.body.errors?.map(
        (error: { extensions: { subCode: string } }) =>
          error.extensions.subCode,
      ),
    ).toContain('TWO_FACTOR_AUTHENTICATION_VERIFICATION_REQUIRED');
  });

  it('rejects expired and wrong-type signed tokens', async () => {
    const valid = await login.generateLoginToken(
      members[0].email,
      members[0].workspaceId,
      AuthProviderEnum.Password,
    );
    const payload = {
      sub: members[0].email,
      workspaceId: members[0].workspaceId,
      type: JwtTokenTypeEnum.LOGIN as const,
      authProvider: AuthProviderEnum.Password,
    };
    expect(valid.token).toBeDefined();
    const expired = await jwt.signAsyncOrThrow(payload, { expiresIn: -1 });
    const wrongType = await jwt.signAsyncOrThrow(
      {
        sub: members[0].email,
        type: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC,
        userId: 'synthetic-user',
        authProvider: AuthProviderEnum.Password,
      },
      { expiresIn: 60 },
    );
    expect((await exchange(expired)).body.errors?.length).toBeGreaterThan(0);
    expect((await exchange(wrongType)).body.errors?.length).toBeGreaterThan(0);
  });

  it('retains existing domain behavior with the default-off flag', () => {
    jest.restoreAllMocks();
    expect(domains.isSameOriginWorkspaceMode()).toBe(false);
    expect(
      domains.getWorkspaceUrls({
        subdomain: 'apple',
        customDomain: null,
        isCustomDomainEnabled: false,
      }).subdomainUrl,
    ).toBe('http://apple.localhost:3001/');
  });
});
