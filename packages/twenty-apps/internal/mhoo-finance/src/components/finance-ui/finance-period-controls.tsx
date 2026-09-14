import type { WorkspaceFinanceData } from '../../investigation/workspace-finance-data';

export type FinancePeriodControlsProps = Readonly<{
  accounts: WorkspaceFinanceData['accounts'];
  accountId: string;
  start: string;
  end: string;
  domainStart: string;
  domainEnd: string;
  onAccountIdChange: (accountId: string) => void;
  onRangeChange: (range: Readonly<{ start: string; end: string }>) => void;
}>;

const readableDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

export const FinancePeriodControls = ({
  accounts, accountId, start, end, domainStart, domainEnd, onAccountIdChange, onRangeChange,
}: FinancePeriodControlsProps) => {
  const months: Array<{ key: string; label: string; end: string }> = [];
  if (domainStart && domainEnd) {
    const cursor = new Date(`${domainStart.slice(0, 7)}-01T00:00:00Z`);
    while (cursor.toISOString().slice(0, 7) <= domainEnd.slice(0, 7)) {
      const key = cursor.toISOString().slice(0, 7);
      const last = new Date(cursor); last.setUTCMonth(last.getUTCMonth() + 1, 0);
      months.push({ key, label: cursor.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), end: key === domainEnd.slice(0, 7) ? domainEnd : last.toISOString().slice(0, 10) });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  return <div className="hi-period-controls" aria-label="Finance period controls">
    <label className="hi-period-account">Account<select aria-label="Filter account" value={accountId} onChange={(event) => onAccountIdChange(event.target.value)}><option value="all">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label>
    <label className="hi-period-date">From<input type="date" min={domainStart} max={domainEnd} value={start} onChange={(event) => onRangeChange({ start: event.target.value, end })} /></label>
    <label className="hi-period-date">To<input type="date" min={domainStart} max={domainEnd} value={end} onChange={(event) => onRangeChange({ start, end: event.target.value })} /></label>
    <span className="hi-period-summary">{start && end ? `${readableDate(start)} – ${readableDate(end)}` : 'No date range'}</span>
    <div className="hi-period-months" aria-label="Select month">{months.map((month) => <button type="button" className="hi-month" key={month.key} aria-pressed={start === `${month.key}-01` && end === month.end} onClick={() => onRangeChange({ start: month.key === domainStart.slice(0, 7) ? domainStart : `${month.key}-01`, end: month.end })}>{month.label}</button>)}</div>
  </div>;
};
