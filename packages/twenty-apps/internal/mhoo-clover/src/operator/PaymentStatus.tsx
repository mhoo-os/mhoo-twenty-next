import { useEffect, useState } from 'react';
import { decodeStatus, pageLabels, pageStatus, type Merchant, type StatusReader, type StatusResult } from './status-contract';
import './payment-status.css';

export function PaymentStatus({ merchants, readStatus }: { merchants: readonly Merchant[]; readStatus: StatusReader }) {
  const [selected, setSelected] = useState('');
  const [request, setRequest] = useState(0);
  const [view, setView] = useState<{ connectionId: string; request: number; result: StatusResult } | null>(null);
  const active = merchants.some((m) => m.id === selected) ? selected : '';
  const current = view?.connectionId === active && view.request === request ? view.result : null;
  useEffect(() => {
    let cancelled = false;
    if (!active) return;
    Promise.resolve().then(() => readStatus(active))
      .then((value) => { if (!cancelled) setView({ connectionId: active, request, result: decodeStatus(value) }); })
      .catch(() => { if (!cancelled) setView({ connectionId: active, request, result: { kind: 'uncertain' } }); });
    return () => { cancelled = true; };
  }, [active, request, readStatus]);
  return <main className="mhoo-clover-status">
    <header className="mhoo-clover-status__header"><span className="mhoo-clover-status__eyebrow">CLOVER / PAYMENT HISTORY</span><h1>Your history.<br />A clearer picture.</h1><p>See what is saved, and what still needs attention.</p></header>
    <section className="mhoo-clover-status__panel"><label htmlFor="clover-status-merchant">Merchant</label><select id="clover-status-merchant" value={active} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a merchant</option>{merchants.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select><p className="mhoo-clover-status__muted">Connections are separate. Selecting one does not grant access.</p></section>
    <section aria-label="Payment status" className="mhoo-clover-status__panel">
      <div className="mhoo-clover-status__row"><h2>Saved payment pages</h2><button disabled={!active || !current} onClick={() => setRequest((n) => n + 1)}>Refresh status</button></div>
      <div role="status" aria-live="polite">
        {!active ? <p>{merchants.length ? 'Choose a merchant to inspect its saved pages.' : 'No authorized connections are available.'}</p> : !current ? <p>Loading saved pages…</p> :
          current.kind === 'denied' ? <p>Access denied. Ask your Workspace administrator to review your permissions.</p> :
          current.kind === 'missing' ? <p>No connection is available. It may have been disconnected.</p> :
          current.kind === 'uncertain' ? <p>Status could not be confirmed. Refresh before taking further action; queued work may still be running.</p> : <>
            {current.pages.length === 0 && <p>No saved pages yet. This does not mean zero activity.</p>}
            {current.pages.map((p, i) => <article key={p.id} className="mhoo-clover-status__page"><div><span className="mhoo-clover-status__number">{String(i + 1).padStart(2, '0')}</span><strong>{p.records} saved records</strong></div><span className="mhoo-clover-status__badge">{pageLabels[pageStatus(p)]}</span></article>)}
            {current.hasMore && <p>More receipts exist. This view is partial.</p>}
          </>}
      </div>
    </section>
    <footer className="mhoo-clover-status__muted">Saved pages describe stored records, not complete provider history. Recurring sync is not enabled.</footer>
  </main>;
}
