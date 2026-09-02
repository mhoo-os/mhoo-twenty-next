import { type CSSProperties, type ReactElement, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';

import {
  FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  type CoveragePeriod,
  type DashboardModel,
  type ReconciliationException,
  FIXTURE_DASHBOARD,
} from 'src/fixtures/fixture-pack';

export type PreviewState =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'partial'
  | 'stale'
  | 'failed'
  | 'denied';

export const PREVIEW_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'populated', label: 'Populated' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'partial', label: 'Partial' },
  { value: 'stale', label: 'Stale' },
  { value: 'failed', label: 'Failed' },
  { value: 'denied', label: 'Denied' },
];

const palette = {
  background: '#f6f8fb',
  border: '#dce3ed',
  card: '#ffffff',
  muted: '#667085',
  text: '#182230',
  green: '#067647',
  orange: '#b54708',
  red: '#b42318',
  purple: '#6941c6',
  blue: '#175cd3',
};

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100%',
    padding: '24px',
    background: palette.background,
    color: palette.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
  },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: 0, fontSize: '22px', lineHeight: 1.25 },
  subtitle: { margin: '6px 0 0', color: palette.muted, fontSize: '13px' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '5px 10px', background: '#ecfdf3', color: palette.green, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
  controls: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
  label: { color: palette.muted, fontSize: '12px', fontWeight: 600 },
  select: { border: `1px solid ${palette.border}`, borderRadius: '6px', background: palette.card, color: palette.text, padding: '7px 10px', fontSize: '13px' },
  banner: { border: `1px solid ${palette.border}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', background: palette.card, color: palette.muted, fontSize: '13px' },
  errorBanner: { borderColor: '#fecdca', background: '#fff5f4', color: palette.red },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '18px' },
  card: { border: `1px solid ${palette.border}`, borderRadius: '10px', background: palette.card, padding: '15px' },
  cardLabel: { color: palette.muted, fontSize: '12px', marginBottom: '8px' },
  cardValue: { fontSize: '22px', fontWeight: 700 },
  cardFoot: { color: palette.muted, fontSize: '11px', marginTop: '6px', lineHeight: 1.4 },
  section: { border: `1px solid ${palette.border}`, borderRadius: '10px', background: palette.card, padding: '16px', marginBottom: '16px' },
  sectionTitle: { margin: '0 0 4px', fontSize: '15px' },
  sectionHelp: { margin: '0 0 14px', color: palette.muted, fontSize: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { borderBottom: `1px solid ${palette.border}`, padding: '8px 6px', color: palette.muted, textAlign: 'left', fontWeight: 600 },
  td: { borderBottom: `1px solid ${palette.border}`, padding: '8px 6px', verticalAlign: 'top' },
  status: { display: 'inline-block', borderRadius: '999px', padding: '3px 7px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.02em' },
  exception: { border: `1px solid ${palette.border}`, borderRadius: '8px', padding: '13px', marginTop: '10px' },
  exceptionHead: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' },
  exceptionTitle: { margin: 0, fontSize: '13px', fontWeight: 700 },
  exceptionText: { margin: '7px 0 0', fontSize: '12px', lineHeight: 1.45 },
  exceptionMeta: { margin: '8px 0 0', color: palette.muted, fontSize: '11px', lineHeight: 1.45 },
  button: { border: `1px solid ${palette.border}`, borderRadius: '6px', background: palette.card, color: palette.blue, padding: '6px 9px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  trace: { marginTop: '12px', borderLeft: `3px solid ${palette.purple}`, paddingLeft: '12px' },
  traceStep: { marginBottom: '9px', fontSize: '12px' },
  traceKind: { color: palette.purple, fontSize: '10px', fontWeight: 700, marginRight: '7px' },
  empty: { border: `1px dashed ${palette.border}`, borderRadius: '10px', padding: '48px 20px', textAlign: 'center', color: palette.muted, background: palette.card },
};

const formatUsd = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const statusColor = (status: CoveragePeriod['status']): CSSProperties => {
  switch (status) {
    case 'COMPLETE':
      return { background: '#ecfdf3', color: palette.green };
    case 'PARTIAL':
      return { background: '#fffaeb', color: palette.orange };
    case 'STALE':
      return { background: '#fff6ed', color: palette.orange };
    case 'NO_DATA':
      return { background: '#fff5f4', color: palette.red };
    case 'NO_ACTIVITY':
      return { background: '#f2f4f7', color: palette.muted };
  }
};

const statusText = (status: CoveragePeriod['status']): string => status.replace('_', ' ');

const exceptionColor = (exception: ReconciliationException): CSSProperties =>
  exception.status === 'RESOLVED'
    ? { background: '#ecfdf3', color: palette.green }
    : exception.severity === 'HIGH'
      ? { background: '#fff5f4', color: palette.red }
      : { background: '#fffaeb', color: palette.orange };

const DashboardCards = ({ data }: { data: DashboardModel }) => (
  <div style={styles.cardGrid}>
    <div style={styles.card}>
      <div style={styles.cardLabel}>Coverage</div>
      <div style={styles.cardValue}>{data.headline.completeCoverageCount}</div>
      <div style={styles.cardFoot}>{data.headline.noDataCoverageCount} no-data · {data.headline.noActivityCoverageCount} no-activity</div>
    </div>
    <div style={styles.card}>
      <div style={styles.cardLabel}>Normalized facts</div>
      <div style={styles.cardValue}>{data.headline.factCount}</div>
      <div style={styles.cardFoot}>Latest revision per source row</div>
    </div>
    <div style={styles.card}>
      <div style={styles.cardLabel}>Open exposure</div>
      <div style={{ ...styles.cardValue, color: palette.red }}>{formatUsd(data.headline.exposureCents)}</div>
      <div style={styles.cardFoot}>{data.headline.openExceptionCount} deterministic exceptions</div>
    </div>
    <div style={styles.card}>
      <div style={styles.cardLabel}>Custody controls</div>
      <div style={styles.cardValue}>{data.headline.revisionCount}</div>
      <div style={styles.cardFoot}>{data.headline.duplicateSuppressedCount} duplicate/retry rows suppressed</div>
    </div>
  </div>
);

const CoverageTable = ({ data }: { data: DashboardModel }) => (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>What is covered?</h2>
    <p style={styles.sectionHelp}>Coverage is source- and period-scoped. No activity is not the same as no data; stale input is visible.</p>
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Period</th>
          <th style={styles.th}>Source</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Rows</th>
          <th style={styles.th}>Lineage</th>
        </tr>
      </thead>
      <tbody>
        {data.coverage.filter((item) => item.artifactIds.length > 0 || item.period === '2026-04' || item.period === '2026-05').slice(0, 14).map((item) => (
          <tr key={item.coverageKey}>
            <td style={styles.td}>{item.period}</td>
            <td style={styles.td}>{item.sourceKind}</td>
            <td style={styles.td}><span style={{ ...styles.status, ...statusColor(item.status) }}>{statusText(item.status)}</span></td>
            <td style={styles.td}>{item.observedRows}</td>
            <td style={{ ...styles.td, color: palette.muted }}>{item.lineage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const Exceptions = ({ data, onTrace }: { data: DashboardModel; onTrace: () => void }) => (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>What changed or looks wrong?</h2>
    <p style={styles.sectionHelp}>Each item carries the deterministic reason, expected versus observed values, limitations, and a bounded next action.</p>
    {data.exceptions.map((exception) => (
      <article key={exception.exceptionKey} style={styles.exception}>
        <div style={styles.exceptionHead}>
          <h3 style={styles.exceptionTitle}>{exception.exceptionKey}</h3>
          <span style={{ ...styles.status, ...exceptionColor(exception) }}>{exception.status} · {exception.severity}</span>
        </div>
        <p style={styles.exceptionText}>{exception.reason}</p>
        <p style={styles.exceptionMeta}>
          Expected {formatUsd(exception.expectedCents)} · observed {formatUsd(exception.observedCents)} · difference {formatUsd(exception.differenceCents)}
        </p>
        <p style={styles.exceptionMeta}><strong>Evidence:</strong> {exception.supportingEvidence}</p>
        <p style={styles.exceptionMeta}><strong>Limit:</strong> {exception.limitingEvidence}</p>
        <p style={styles.exceptionMeta}><strong>Next:</strong> {exception.nextAction}</p>
        <button type="button" style={styles.button} onClick={onTrace}>View bounded source trace</button>
      </article>
    ))}
  </section>
);

export type FinanceAuditDashboardProps = {
  initialPreviewState?: PreviewState;
  showTraceInitially?: boolean;
};

export const FinanceAuditDashboard = ({
  initialPreviewState = 'populated',
  showTraceInitially = false,
}: FinanceAuditDashboardProps = {}): ReactElement => {
  const [previewState, setPreviewState] =
    useState<PreviewState>(initialPreviewState);
  const [showTrace, setShowTrace] = useState(showTraceInitially);
  const data = FIXTURE_DASHBOARD;

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Mhoo Finance audit dashboard</h1>
          <p style={styles.subtitle}>Six-year review loop preview · {data.datasetId} · corrected fixture revision</p>
        </div>
        <span style={styles.badge}>Synthetic · read-only</span>
      </header>

      <div style={styles.controls}>
        <label htmlFor="preview-state" style={styles.label}>Preview state</label>
        <select id="preview-state" value={previewState} onChange={(event) => { setPreviewState(event.target.value as PreviewState); setShowTrace(false); }} style={styles.select}>
          {PREVIEW_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
        </select>
        <span style={styles.label}>Fixture controls are local and never call a provider.</span>
      </div>

      {previewState === 'loading' ? <div style={styles.empty}>Loading source receipts and normalized facts…</div> : null}
      {previewState === 'empty' ? <div style={styles.empty}>No authorized fixture records are available for this Workspace.</div> : null}
      {previewState === 'denied' ? <div style={{ ...styles.empty, color: palette.red }}>Access denied. The dashboard returned no facts or lineage for this Workspace.</div> : null}
      {previewState === 'failed' ? <div style={{ ...styles.empty, ...styles.errorBanner }}>The fixture read failed closed. Retry the bounded local preview after checking the receipt.</div> : null}
      {previewState === 'partial' ? <div style={styles.banner}>Partial fixture view: March card input is stale and April has no data. Totals remain labeled with their source coverage.</div> : null}
      {previewState === 'stale' ? <div style={{ ...styles.banner, ...styles.errorBanner }}>Stale fixture view: one source artifact is stale. No fresh conclusion is promoted from it.</div> : null}

      {previewState === 'populated' || previewState === 'partial' || previewState === 'stale' ? (
        <>
          <DashboardCards data={data} />
          <CoverageTable data={data} />
          <Exceptions data={data} onTrace={() => setShowTrace(true)} />
          {showTrace ? (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Can I verify it?</h2>
              <p style={styles.sectionHelp}>This bounded trace stays inside the synthetic dataset and ends at an exact artifact row.</p>
              <div style={styles.trace}>
                {data.trace.map((step) => (
                  <div key={`${step.kind}-${step.reference}`} style={styles.traceStep}>
                    <span style={styles.traceKind}>{step.kind}</span>
                    <span>{step.label} · <strong>{step.reference}</strong></span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'finance-audit-dashboard',
  description: 'Synthetic read-only finance coverage, exceptions, and source-lineage preview.',
  component: FinanceAuditDashboard,
});
