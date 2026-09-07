import { getTokenPair } from '@/apollo/utils/getTokenPair';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

type Receipt = {
  connectedAccountId: string;
  merchantId: string;
  merchantName: string;
  savedAt: string;
};
type Status = {
  enabled: boolean;
  receipt: Receipt | null;
  receipts?: Receipt[];
  canPrepareInvitation?: boolean;
};
type Handoff = { requestId: string; merchantId: string; expiresAt: string };

const StyledPanel = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: 20px;
  line-height: 1.6;
  padding: 24px;
  label {
    display: grid;
    font-weight: 600;
    gap: 8px;
  }
  input[type='text'],
  input[type='password'] {
    background: ${themeCssVariables.background.primary};
    border: 1px solid ${themeCssVariables.border.color.strong};
    border-radius: 6px;
    color: ${themeCssVariables.font.color.primary};
    font: inherit;
    min-width: 0;
    padding: 12px;
  }
  input:focus-visible {
    outline: 2px solid ${themeCssVariables.color.green};
    outline-offset: 2px;
  }
  form {
    display: grid;
    gap: 20px;
  }
  p {
    margin: 0;
  }
  small {
    font-weight: 400;
  }
`;

// Native Twenty bearer auth only. The Clover token never touches Apollo,
// localStorage, query strings, clipboard APIs, or the Cloudflare guide.
export async function cloverRequest<T>(
  path: string,
  body?: object,
  signal?: AbortSignal,
): Promise<T> {
  const bearer = getTokenPair()?.accessOrWorkspaceAgnosticToken.token;
  if (!bearer) throw new Error('Sign in to your Workspace again, then retry.');

  const response = await fetch(
    `${REACT_APP_SERVER_BASE_URL}/clover-token/${path}`,
    {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${bearer}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      // Preserve the same-origin Cloudflare Access session. Native Twenty
      // authorization still requires the explicit bearer above; cookies alone
      // cannot authorize intake. Never send cookies to a different origin.
      credentials: 'same-origin',
      redirect: 'error',
      signal,
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Sign in to Hass’s Workspace with permission to manage connections.',
      );
    }
    if (response.status === 409) {
      throw new Error(
        'This handoff expired or a connection already exists. Refresh to check, then start again.',
      );
    }
    throw new Error(
      'The token was not confirmed saved. Check your merchant ID and token, then retry.',
    );
  }
  return response.json();
}

const CloverForm = ({ workspaceName }: { workspaceName: string }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [merchantId, setMerchantId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState('');
  const tokenInput = useRef<HTMLInputElement>(null);
  // An imperative transport handle, never UI state or a credential.
  // oxlint-disable-next-line twenty/no-state-useref
  const abort = useRef(new AbortController());
  const bindTokenInput = useCallback((node: HTMLInputElement | null) => {
    if (tokenInput.current && tokenInput.current !== node)
      tokenInput.current.value = '';
    tokenInput.current = node;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    void cloverRequest<Status>('status', undefined, controller.signal)
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'Clover connection is unavailable. Refresh or contact your Workspace administrator.',
          );
      });
    return () => {
      controller.abort();
    };
  }, []);

  if (status?.enabled === false || (!status && !error)) return null;

  return (
    <Section>
      <H2Title title="Connect Clover" description={`For ${workspaceName}`} />
      <StyledPanel
        id="clover"
        className="sentry-block"
        data-replay-ignore-mutations
      >
        {error && <p role="alert">{error}</p>}
        {status?.canPrepareInvitation && (
          <>
            <Button
              type="button"
              variant="secondary"
              title="Prepare onboarding invitation"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const result = await cloverRequest<{ email: string }>(
                    'prepare-invitation',
                    {},
                    abort.current.signal,
                  );
                  if (!abort.current.signal.aborted)
                    setInvitation(
                      `Invitation ready for ${result.email}. They can sign in with Google to join ${workspaceName}. No email has been sent.`,
                    );
                } catch {
                  if (!abort.current.signal.aborted)
                    setError(
                      'The invitation could not be prepared. Check the Members page.',
                    );
                } finally {
                  if (!abort.current.signal.aborted) setBusy(false);
                }
              }}
            />
            {invitation && <p role="status">{invitation}</p>}
          </>
        )}
        {(status?.receipts ?? (status?.receipt ? [status.receipt] : [])).map(
          (saved) => (
            <div role="status" key={saved.connectedAccountId}>
              <p>
                <strong>Clover token saved securely.</strong>
              </p>
              <p>
                {saved.merchantName} · {saved.merchantId}
              </p>
              <p>Connected to {workspaceName}.</p>
              <small>
                To stop access, revoke this token in your Clover dashboard.
              </small>
            </div>
          ),
        )}
        {status?.enabled && (
          <>
            {!handoff ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError('');
                  try {
                    setHandoff(
                      await cloverRequest<Handoff>(
                        'begin',
                        { merchantId },
                        abort.current.signal,
                      ),
                    );
                  } catch (failure) {
                    if (!abort.current.signal.aborted)
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : 'Please try again.',
                      );
                  } finally {
                    if (!abort.current.signal.aborted) setBusy(false);
                  }
                }}
              >
                <label htmlFor="clover-merchant-id">
                  Clover merchant ID
                  <input
                    id="clover-merchant-id"
                    type="text"
                    value={merchantId}
                    onChange={(event) =>
                      setMerchantId(event.target.value.trim().toUpperCase())
                    }
                    autoComplete="off"
                    spellCheck={false}
                    required
                    minLength={13}
                    maxLength={13}
                    pattern="[A-Z0-9]{13}"
                    disabled={busy}
                  />
                  <small>
                    The 13 characters after /merchants/ in your Clover dashboard
                    address.
                  </small>
                </label>
                <Button
                  type="submit"
                  title={busy ? 'Preparing…' : 'Continue'}
                  accent="green"
                  disabled={busy}
                />
              </form>
            ) : (
              <form
                autoComplete="off"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!tokenInput.current || !confirmed || busy) return;
                  const accessToken = tokenInput.current.value.trim();
                  tokenInput.current.value = '';
                  setBusy(true);
                  setError('');
                  try {
                    const receipt = await cloverRequest<Receipt>(
                      'submit',
                      {
                        requestId: handoff.requestId,
                        accessToken,
                        readOnlyConfirmed: confirmed,
                      },
                      abort.current.signal,
                    );
                    if (!abort.current.signal.aborted) {
                      setStatus((current) => ({
                        enabled: true,
                        receipt,
                        receipts: [
                          ...(
                            current?.receipts ??
                            (current?.receipt ? [current.receipt] : [])
                          ).filter(
                            (saved) =>
                              saved.connectedAccountId !==
                              receipt.connectedAccountId,
                          ),
                          receipt,
                        ],
                      }));
                      setHandoff(null);
                      setMerchantId('');
                    }
                  } catch (failure) {
                    if (!abort.current.signal.aborted) {
                      // A lost response may follow a committed save. Check the native
                      // receipt without resending or retaining the credential.
                      try {
                        const latest = await cloverRequest<Status>(
                          'status',
                          undefined,
                          abort.current.signal,
                        );
                        setStatus(latest);
                        if (
                          !(
                            latest.receipts ??
                            (latest.receipt ? [latest.receipt] : [])
                          ).some(
                            (saved) => saved.merchantId === handoff.merchantId,
                          )
                        )
                          setError(
                            failure instanceof Error
                              ? failure.message
                              : 'Please try again.',
                          );
                      } catch {
                        setError(
                          'We could not confirm the save. Refresh to check before trying again.',
                        );
                      }
                    }
                  } finally {
                    if (!abort.current.signal.aborted) setBusy(false);
                  }
                }}
              >
                <p>
                  Merchant <strong>{handoff.merchantId}</strong>
                </p>
                <label htmlFor="clover-token-value">
                  Paste your Clover API token
                  <input
                    ref={bindTokenInput}
                    id="clover-token-value"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    minLength={20}
                    maxLength={2048}
                    disabled={busy}
                    data-lpignore="true"
                    data-1p-ignore="true"
                  />
                </label>
                <label htmlFor="clover-read-only">
                  <span>
                    <input
                      id="clover-read-only"
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      required
                      disabled={busy}
                    />{' '}
                    All six Read permissions are selected. Every Write
                    permission is off.
                  </span>
                </label>
                <small>
                  Encrypted in your Workspace. This form expires after 10
                  minutes.
                </small>
                <Button
                  type="submit"
                  title={
                    busy ? 'Verifying and saving…' : 'Save encrypted token'
                  }
                  accent="green"
                  disabled={busy || !confirmed}
                />
                <Button
                  type="button"
                  title="Start again"
                  variant="tertiary"
                  disabled={busy}
                  onClick={() => {
                    setHandoff(null);
                    setConfirmed(false);
                    setError('');
                  }}
                />
              </form>
            )}
          </>
        )}
      </StyledPanel>
    </Section>
  );
};

export const SettingsCloverConnection = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  // A Workspace switch destroys the form and its in-memory request state.
  return currentWorkspace ? (
    <CloverForm
      key={currentWorkspace.id}
      workspaceName={currentWorkspace.displayName ?? 'your Workspace'}
    />
  ) : null;
};
