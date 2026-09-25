import 'twenty-ui/style.css';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineSettingsFrontComponent } from 'twenty-sdk/define';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { H1Title, H2Title } from 'twenty-ui/typography';
import {
  OPERATOR_SETTINGS_COMPONENT,
  OPERATOR_STATUS_FUNCTION,
  PAYMENT_HISTORY_FUNCTION,
  PAYMENT_RECOVERY_FUNCTION,
} from '../contracts/model-identifiers';

type Connection = {
  id: string;
  name: string;
  merchantId: string;
  environment: 'sandbox' | 'production-na';
  grantId: string | null;
};
type Receipt = {
  id: string;
  fromMs: number;
  toMs: number;
  offset: number;
  nextOffset: number | null;
  rowCount: number;
  observedAt: string;
  currentGrant: boolean;
};
type Snapshot = {
  connections: Connection[];
  receipts: Receipt[];
  hasMoreConnections: boolean;
  hasMoreReceipts: boolean;
};
const empty: Snapshot = {
  connections: [],
  receipts: [],
  hasMoreConnections: false,
  hasMoreReceipts: false,
};

export const invokeCloverOperator = async (
  universalIdentifier: string,
  payload: Record<string, unknown>,
) => {
  const client = new MetadataApiClient({ runAs: 'user' });
  const metadata = await client.query({
    findManyLogicFunctions: { id: true, universalIdentifier: true },
  });
  const functions = metadata.findManyLogicFunctions.filter(
    (fn) => fn.universalIdentifier === universalIdentifier,
  );
  if (functions.length !== 1)
    throw new Error('Clover operator function unavailable.');
  const result = await client.mutation({
    executeOneLogicFunction: {
      __args: { input: { id: functions[0].id, payload } },
      status: true,
      data: true,
    },
  });
  if (result.executeOneLogicFunction.status !== 'SUCCESS')
    throw new Error('Clover action was not confirmed.');
  return result.executeOneLogicFunction.data;
};

export const CloverOperator = () => {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [selectedId, setSelectedId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState('');
  const selected = snapshot.connections.find(
    (connection) => connection.id === selectedId,
  );
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setSnapshot(empty);
    invokeCloverOperator(
      OPERATOR_STATUS_FUNCTION,
      selectedId ? { connectionId: selectedId } : {},
    )
      .then((data) => {
        if (!cancelled) setSnapshot(data as Snapshot);
      })
      .catch(() => {
        if (!cancelled)
          setMessage(
            'Status unavailable. Check your Workspace access, then refresh.',
          );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, refresh]);
  const act = async (kind: 'history' | 'recover', receiptId?: string) => {
    if (!selected?.grantId || busy) return;
    let range: { fromMs: number; toMs: number; timeField: string } | undefined;
    if (kind === 'history') {
      const fromMs = Date.parse(`${from}T00:00:00Z`),
        toMs = Date.parse(`${to}T00:00:00Z`);
      if (
        !Number.isFinite(fromMs) ||
        !Number.isFinite(toMs) ||
        fromMs >= toMs ||
        toMs > Date.now()
      ) {
        setMessage(
          'Choose a past start date and a later end date. Dates use UTC; the end date is excluded.',
        );
        return;
      }
      range = { fromMs, toMs, timeField: 'modifiedTime' };
    }
    setBusy(true);
    setMessage('Submitting…');
    try {
      const result = (await invokeCloverOperator(
        kind === 'history'
          ? PAYMENT_HISTORY_FUNCTION
          : PAYMENT_RECOVERY_FUNCTION,
        {
          connectionId: selected.id,
          grantId: selected.grantId,
          ...(range ?? { receiptId }),
        },
      )) as { status: string; queuedRanges?: number };
      setMessage(
        result.status === 'queued'
          ? `Queued${result.queuedRanges ? ` ${result.queuedRanges} ranges` : ' the next page'}. This is not confirmation that history is complete.`
          : result.status === 'needsRangeSubdivision'
            ? 'This range needs smaller date windows. No further page was queued.'
            : 'This page ends its range. Full provider coverage is still unverified.',
      );
      setRefresh((value) => value + 1);
    } catch {
      setMessage(
        'Submission was not confirmed. Refresh saved pages before retrying; work may already be queued.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main
      className="mhoo-clover-operator"
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 32,
        display: 'grid',
        gap: 24,
      }}
    >
      <header>
        <H1Title title="Clover history" />
        <p>Import a date range or resume from a saved page.</p>
      </header>
      <Card>
        <CardContent>
          <label htmlFor="mhoo-clover-merchant">Merchant</label>
          <br />
          <select
            id="mhoo-clover-merchant"
            value={selectedId}
            disabled={busy}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setMessage('');
            }}
            style={{ padding: 12, marginTop: 8, minWidth: 240 }}
          >
            <option value="">Choose a merchant</option>
            {snapshot.connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name || connection.merchantId} ·{' '}
                {connection.environment === 'sandbox' ? 'Sandbox' : 'Production'}
              </option>
            ))}
          </select>
          {selected && (
            <p>
              {selected.environment === 'sandbox'
                ? 'Sandbox test merchant. Data here is separate from production. '
                : 'Production merchant. '}
              {selected.grantId
                ? 'Scheduled access allowed. Recurring sync is not enabled.'
                : 'Scheduled access is off. Enable it in Workspace connection settings before importing.'}
            </p>
          )}
          {!busy && snapshot.connections.length === 0 && (
            <p>No authorized Clover connections are available.</p>
          )}
          {snapshot.hasMoreConnections && (
            <p>Showing the first 50 authorized connections.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <H2Title title="Import history" />
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              margin: '16px 0',
            }}
          >
            <label>
              Start date
              <br />
              <input
                aria-label="Start date"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              End date · excluded
              <br />
              <input
                aria-label="End date"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>
          <p>
            UTC dates. Large ranges are split into bounded jobs. Provider
            coverage remains unverified.
          </p>
          <Button
            title="Queue history"
            disabled={busy || !selected?.grantId}
            onClick={() => void act('history')}
          />
        </CardContent>
      </Card>
      <section>
        <H2Title title="Saved pages" />
        <p>
          A saved page confirms stored records. It does not prove that the
          entire history was imported.
        </p>
        <Button
          title="Refresh saved pages"
          disabled={busy}
          onClick={() => setRefresh((value) => value + 1)}
        />
        {busy && <p role="status">Loading…</p>}
        {!busy && selected && snapshot.receipts.length === 0 && (
          <p>No saved pages yet. Queued work may still be running.</p>
        )}
        {snapshot.receipts.map((r) => (
          <Card key={r.id}>
            <CardContent>
              <strong>
                {new Date(r.fromMs).toISOString().slice(0, 10)} →{' '}
                {new Date(r.toMs).toISOString().slice(0, 10)}
              </strong>
              <p>
                {r.rowCount} records · offset {r.offset} ·{' '}
                {r.nextOffset === null
                  ? 'Range ended; coverage unverified'
                  : r.nextOffset > 10000
                    ? 'Needs smaller date windows'
                    : 'Next page can be resumed'}
              </p>
              {!r.currentGrant && (
                <p>
                  This page belongs to an earlier grant. Start a new bounded
                  range under the current grant.
                </p>
              )}
              {r.nextOffset !== null && r.nextOffset <= 10000 && (
                <Button
                  title="Resume next page"
                  disabled={busy || !r.currentGrant || !selected?.grantId}
                  onClick={() => void act('recover', r.id)}
                />
              )}
            </CardContent>
          </Card>
        ))}
        {snapshot.hasMoreReceipts && (
          <p>
            Showing the latest 50 pages. Older receipts remain in Workspace
            records.
          </p>
        )}
      </section>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </main>
  );
};
export default defineSettingsFrontComponent({
  universalIdentifier: OPERATOR_SETTINGS_COMPONENT,
  name: 'Clover history and recovery',
  component: CloverOperator,
});
