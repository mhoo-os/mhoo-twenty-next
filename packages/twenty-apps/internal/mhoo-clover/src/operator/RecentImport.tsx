import { useEffect, useState } from 'react';

type Plan = {
  kind: 'ready';
  connectionId: string;
  merchantId: string;
  merchantName: string;
  fromMs: number;
  toMs: number;
};
type SavedPage = {
  receiptId: string;
  records: number;
  moreAvailable: boolean;
  fromMs: number;
  toMs: number;
};
type Result =
  | { kind: 'saved'; records: number; moreAvailable: boolean }
  | { kind: 'uncertain' };
export type RecentPageRequest = (body: unknown) => Promise<unknown>;

export function RecentImport({
  connectionId,
  onSaved,
  request,
}: {
  connectionId: string;
  onSaved: () => void;
  request: RecentPageRequest;
}) {
  const [pages, setPages] = useState<SavedPage[] | null>(null);
  const [receiptRevision, setReceiptRevision] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [receiptUncertain, setReceiptUncertain] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setReceiptUncertain(false);
    request({ kind: 'receipts', connectionId })
      .then((raw) => {
        const value = raw as Record<string, unknown>;
        if (
          value.kind !== 'receipts' ||
          !Array.isArray(value.pages) ||
          value.pages.length > 5 ||
          typeof value.hasMore !== 'boolean'
        )
          throw new Error('Unavailable receipts');
        const decoded: SavedPage[] = value.pages.map((rawPage) => {
          const page = rawPage as Record<string, unknown>;
          if (
            !page ||
            typeof page.receiptId !== 'string' ||
            !/^[a-f0-9-]{36}$/i.test(page.receiptId) ||
            !Number.isInteger(page.records) ||
            Number(page.records) < 0 ||
            Number(page.records) > 100 ||
            typeof page.moreAvailable !== 'boolean' ||
            !Number.isSafeInteger(page.fromMs) ||
            !Number.isSafeInteger(page.toMs) ||
            Number(page.toMs) - Number(page.fromMs) !== 86_400_000
          )
            throw new Error('Invalid receipt');
          return {
            receiptId: page.receiptId,
            records: Number(page.records),
            moreAvailable: page.moreAvailable,
            fromMs: Number(page.fromMs),
            toMs: Number(page.toMs),
          };
        });
        if (!cancelled) {
          setPages(decoded);
          setHasMore(value.hasMore);
        }
      })
      .catch(() => {
        if (!cancelled) setReceiptUncertain(true);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId, receiptRevision, request]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const prepare = async () => {
    setBusy(true);
    setResult(null);
    setPlan(null);
    setConfirmed(false);
    try {
      const value = (await request({ kind: 'prepare', connectionId })) as Record<
        string,
        unknown
      >;
      if (
        value.kind !== 'ready' ||
        value.connectionId !== connectionId ||
        typeof value.merchantId !== 'string' ||
        !/^[A-Z0-9]{13}$/.test(value.merchantId) ||
        typeof value.merchantName !== 'string' ||
        value.merchantName.length > 200 ||
        !Number.isSafeInteger(value.fromMs) ||
        !Number.isSafeInteger(value.toMs) ||
        Number(value.toMs) - Number(value.fromMs) !== 86_400_000 ||
        value.maximumRecords !== 100
      )
        throw new Error('Unavailable plan');
      setPlan({
        kind: 'ready',
        connectionId,
        merchantId: value.merchantId,
        merchantName: value.merchantName,
        fromMs: Number(value.fromMs),
        toMs: Number(value.toMs),
      });
    } catch {
      setResult({ kind: 'uncertain' });
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!plan || !confirmed || busy) return;
    setBusy(true);
    try {
      const value = (await request({
        kind: 'import',
        connectionId,
        fromMs: plan.fromMs,
        toMs: plan.toMs,
        readOnlyConfirmed: true,
      })) as Record<string, unknown>;
      if (
        value.kind !== 'saved' ||
        !Number.isInteger(value.records) ||
        Number(value.records) < 0 ||
        Number(value.records) > 100 ||
        typeof value.moreAvailable !== 'boolean'
      )
        throw new Error('Unconfirmed save');
      setResult({
        kind: 'saved',
        records: Number(value.records),
        moreAvailable: value.moreAvailable,
      });
      setPlan(null);
      setReceiptRevision((n) => n + 1);
      onSaved();
    } catch {
      setResult({ kind: 'uncertain' });
    } finally {
      setBusy(false);
    }
  };
  const checkReceipt = async () => {
    if (!plan || busy) return;
    setBusy(true);
    try {
      const value = (await request({
        kind: 'receipt',
        connectionId,
        fromMs: plan.fromMs,
        toMs: plan.toMs,
      })) as Record<string, unknown>;
      if (
        value.kind !== 'saved' ||
        !Number.isInteger(value.records) ||
        Number(value.records) < 0 ||
        Number(value.records) > 100 ||
        typeof value.moreAvailable !== 'boolean'
      )
        throw new Error('Unconfirmed receipt');
      setResult({
        kind: 'saved',
        records: Number(value.records),
        moreAvailable: value.moreAvailable,
      });
      setPlan(null);
      setReceiptRevision((n) => n + 1);
      onSaved();
    } catch {
      setResult({ kind: 'uncertain' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mhoo-clover-status__panel" aria-label="Recent import">
      <div className="mhoo-clover-status__row">
        <h2>Your recent imports</h2>
        <button
          disabled={!pages && !receiptUncertain}
          onClick={() => setReceiptRevision((n) => n + 1)}
        >
          Refresh recent receipts
        </button>
      </div>
      {receiptUncertain ? (
        <p>
          Could not confirm saved receipts. Check your connection and try
          refreshing.
        </p>
      ) : !pages ? (
        <p>Loading your saved receipts…</p>
      ) : pages.length === 0 ? (
        <p>No interactive import receipt was found for your membership.</p>
      ) : (
        pages.map((page) => (
          <article key={page.receiptId}>
            <strong>{page.records} saved records</strong>
            <p>
              {new Date(page.fromMs).toISOString()} →{' '}
              {new Date(page.toMs).toISOString()}
            </p>
            <p>
              {page.moreAvailable
                ? 'Stopped at the page limit.'
                : 'Page ended.'}{' '}
              Coverage and currency remain unverified.
            </p>
          </article>
        ))
      )}
      {hasMore && <p>Showing the five most recent receipts.</p>}
      <h2>Start with a small sample</h2>
      <p>Last 24 hours. Up to 100 payments. Stops after one page.</p>
      {!plan && result?.kind !== 'saved' && (
        <button disabled={busy} onClick={prepare}>
          {busy
            ? 'Checking merchant…'
            : result?.kind === 'uncertain'
              ? 'Retry merchant verification'
              : 'Verify merchant'}
        </button>
      )}
      {plan && (
        <>
          <p>
            <strong>{plan.merchantName}</strong>
            <br />
            Merchant {plan.merchantId}
          </p>
          <p>
            {new Date(plan.fromMs).toISOString()} →{' '}
            {new Date(plan.toMs).toISOString()}
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            I checked this merchant and confirmed the token has only Read
            permissions in Clover.
          </label>
          <p className="mhoo-clover-status__muted">
            Token permissions are not independently verified here. Check the
            Read settings in Clover before continuing.
          </p>
          <button
            disabled={!confirmed || busy || result?.kind === 'uncertain'}
            onClick={save}
          >
            {busy ? 'Saving recent page…' : 'Import up to 100 payments'}
          </button>
        </>
      )}
      {plan && result?.kind === 'uncertain' && (
        <button disabled={busy} onClick={checkReceipt}>
          {busy ? 'Checking receipt…' : 'Check saved receipt'}
        </button>
      )}
      <div role="status" aria-live="polite">
        {result?.kind === 'saved' ? (
          <p>
            {result.records} records saved.{' '}
            {result.moreAvailable
              ? 'More payments may exist; this import stopped at the limit.'
              : 'The page ended; complete history is not verified.'}{' '}
            Currency remains unverified.
          </p>
        ) : result?.kind === 'uncertain' ? (
          <p>
            Could not confirm this step. Refresh saved status before retrying;
            some records may already be saved.
          </p>
        ) : null}
      </div>
    </section>
  );
}
