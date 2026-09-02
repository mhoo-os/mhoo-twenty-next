import { describe, expect, it } from 'vitest';

import { AUTHORIZATION_FIXTURES } from 'src/fixtures/authorization-fixtures';

describe('Mhoo Finance authorization decision vectors', () => {
  it('keeps allow and deny cases explicit without implementing a second authority', () => {
    expect(AUTHORIZATION_FIXTURES).toHaveLength(4);
    expect(
      AUTHORIZATION_FIXTURES.filter((fixture) => fixture.expected === 'ALLOW_READ'),
    ).toHaveLength(1);
    expect(
      AUTHORIZATION_FIXTURES.filter((fixture) => fixture.expected === 'DENY'),
    ).toHaveLength(3);
    expect(
      AUTHORIZATION_FIXTURES.every((fixture) => fixture.reason.length > 0),
    ).toBe(true);
  });

  it('covers write denial and the Twenty-owned Workspace boundary', () => {
    expect(
      AUTHORIZATION_FIXTURES.find(
        (fixture) => fixture.operation === 'WRITE',
      ),
    ).toMatchObject({ expected: 'DENY' });
    expect(
      AUTHORIZATION_FIXTURES.find(
        (fixture) => fixture.workspace === 'synthetic-workspace-b',
      ),
    ).toMatchObject({ expected: 'DENY' });
  });
});
