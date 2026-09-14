import React, { useMemo, useState } from 'react';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import './reconciliation-hero.css';

type Account = {
  name: string;
  detail: string;
  color: string;
  observed: number[];
  statement: number[];
  status: string;
};

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Illustrative values only. No Workspace records are read by this prototype.
const accounts: Account[] = [
  { name: 'Operating', detail: 'Checking · •••• 8612', color: '#66ded1', observed: [48, 52, 47, 63, 58, 73, 68, 76, 69, 82, 79, 91], statement: [48, 52, 47, 63, 58, 73, 68, 76, 69, 82, 79, 91], status: 'Aligned' },
  { name: 'Payroll', detail: 'Checking · •••• 1207', color: '#87a7ff', observed: [35, 31, 37, 28, 34, 26, 30, 27, 33, 23, 28, 25], statement: [35, 31, 37, 28, 34, 26, 30, 27, 33, 23, 28, 25], status: 'Aligned' },
  { name: 'Reserve', detail: 'Savings · •••• 4904', color: '#c7a4ed', observed: [22, 23, 25, 28, 29, 34, 35, 39, 42, 46, 48, 51], statement: [22, 23, 25, 28, 29, 34, 35, 39, 42, 46, 48, 51], status: 'Aligned' },
  { name: 'Corporate card', detail: 'Card · •••• 3652', color: '#e9b879', observed: [20, 28, 25, 33, 29, 41, 37, 45, 38, 46, 44, 53], statement: [20, 28, 25, 33, 29, 41, 37, 45, 38, 46, 44, 49], status: 'Difference' },
  { name: 'Merchant clearing', detail: 'Settlement · •••• 7721', color: '#ef91a8', observed: [18, 24, 23, 27, 32, 36, 34, 42, 41, 48, 51, 59], statement: [18, 24, 23, 27, 32, 36, 34, 42, 41, 48, 51, 59], status: 'Aligned' },
];

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value * 1000);
const signedMoney = (value: number) => value > 0 ? `+${money(value)}` : money(value);

export function ReconciliationHeroPrototype() {
  const [start, setStart] = useState(2);
  const [end, setEnd] = useState(11);
  const [selected, setSelected] = useState('Corporate card');
  const [detailOpen, setDetailOpen] = useState(false);
  const active = accounts.find((account) => account.name === selected) ?? accounts[0];
  const selectedDifference = active.observed[end] - active.statement[end];
  const ticks = useMemo(() => months.map((label, index) => ({ label, index })), []);
  const x = scaleLinear({ domain: [start, end], range: [0, 1000] });

  return (
    <div className="rh-shell">
      <header className="rh-topbar">
        <div className="rh-brand"><span className="rh-brandmark" /> Finance <span className="rh-top-divider" /> Investigation</div>
        <span className="rh-prototype-tag">SYNTHETIC PROTOTYPE · NOT WORKSPACE DATA</span>
      </header>
      <main>
        <div className="rh-intro">
          <div>
            <p className="rh-overline">Account reconciliation</p>
            <h1>Follow the difference.</h1>
            <p>Five accounts, one shared period. Select an account to examine its statement control.</p>
          </div>
          <div className="rh-intro-status"><span className="rh-status-light" /> Illustrative review · 2025</div>
        </div>

        <section className="rh-hero" aria-label="Five account reconciliation timelines">
          <div className="rh-ambient rh-ambient-one" /><div className="rh-ambient rh-ambient-two" />
          <div className="rh-chart-heading">
            <div><h2>Account movement</h2><p>Illustrative month-end balance · shared $0–$100k scale · USD</p></div>
            <div className="rh-heading-meta"><span>SELECTED PERIOD</span><strong>{months[start]} – {months[end]} 2025</strong></div>
            <div className="rh-series-key"><span className="rh-key-solid" /> Ledger observed <span className="rh-key-dashed" /> Statement control</div>
          </div>
          <div className="rh-plot" role="group" aria-label="Select one account for detail">
            <div className="rh-plot-top"><span>ACCOUNT / SOURCE</span><span>ILLUSTRATIVE BALANCE TREND</span><span>CONTROL AT PERIOD END</span></div>
            {accounts.map((account) => {
              const isSelected = account.name === selected;
              const observed = account.observed.slice(start, end + 1).map((value, offset) => ({ x: start + offset, y: value }));
              const statement = account.statement.slice(start, end + 1).map((value, offset) => ({ x: start + offset, y: value }));
              const y = scaleLinear({ domain: [0, 100], range: [90, 11] });
              const difference = account.observed[end] - account.statement[end];
              return (
                <button className={`rh-lane ${isSelected ? 'rh-lane-selected' : ''}`} key={account.name} onClick={() => { setSelected(account.name); setDetailOpen(true); }} aria-current={isSelected ? 'true' : undefined} aria-label={`${account.name}, ${isSelected ? 'selected, ' : ''}${difference ? `difference ${signedMoney(difference)}` : 'illustrative match'}`}>
                  <span className="rh-account"><span className="rh-account-swatch" style={{ background: account.color }} /><span><strong>{account.name}</strong><small>{account.detail}</small></span></span>
                  <span className="rh-chart-cell">
                    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-label={`${account.name} illustrative trend`}>
                      <defs><linearGradient id={`wash-${account.name.replaceAll(' ', '-')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={account.color} stopOpacity=".20" /><stop offset="1" stopColor={account.color} stopOpacity="0" /></linearGradient></defs>
                      <path d={`M ${x(start)} 100 ${observed.map((p) => `L ${x(p.x)} ${y(p.y)}`).join(' ')} L ${x(end)} 100 Z`} fill={`url(#wash-${account.name.replaceAll(' ', '-')})`} />
                      <line x1={x(start)} x2={x(end)} y1="88" y2="88" stroke="rgba(190,205,226,.16)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      <LinePath data={statement} x={(p) => x(p.x)} y={(p) => y(p.y)} stroke={account.color} strokeOpacity=".42" strokeWidth={1.5} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
                      <LinePath data={observed} x={(p) => x(p.x)} y={(p) => y(p.y)} stroke={account.color} strokeWidth={isSelected ? 3 : 2} vectorEffect="non-scaling-stroke" />
                      {difference ? <line x1={x(end)} x2={x(end)} y1={y(account.statement[end])} y2={y(account.observed[end])} stroke="#ffc581" strokeWidth="3" vectorEffect="non-scaling-stroke" /> : null}
                      <circle cx={x(end)} cy={y(account.statement[end])} r="3" fill="#182943" stroke={account.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                      <circle cx={x(end)} cy={y(account.observed[end])} r="4" fill={account.color} vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                  <span className="rh-control"><strong className={difference ? 'rh-difference' : ''}>{difference ? signedMoney(difference) : 'Match'}</strong><small>{difference ? 'Ledger − statement' : money(account.statement[end]) + ' statement'}</small></span>
                </button>
              );
            })}
          </div>
          <div className="rh-time-axis"><span>{months[start]}</span><span>{months[Math.floor((start + end) / 2)]}</span><span>{months[end]} 2025</span></div>
          <div className="rh-timeline-panel">
            <div className="rh-timeline-heading"><div><strong>Period navigator</strong><span>Drag either edge to resize the shared window</span></div><span className="rh-unit-label">Monthly · 2025</span></div>
            <div className="rh-timeline" role="group" aria-label="Selected period">
              <div className="rh-timeline-track"><div className="rh-timeline-selection" style={{ left: `${start / 11 * 100}%`, right: `${(11 - end) / 11 * 100}%` }} /></div>
              <input aria-label="Period start month" type="range" min="0" max="10" step="1" value={start} onChange={(event) => setStart(Math.min(Number(event.target.value), end - 1))} />
              <input aria-label="Period end month" type="range" min="1" max="11" step="1" value={end} onChange={(event) => setEnd(Math.max(Number(event.target.value), start + 1))} />
            </div>
            <div className="rh-timeline-labels">{ticks.filter((tick) => tick.index % 2 === 0 || tick.index === 11).map((tick) => <span key={tick.index} style={{ left: `${tick.index / 11 * 100}%` }}>{tick.label}</span>)}</div>
          </div>
        </section>

        <section className="rh-review" aria-label="Selected account detail"><div><p className="rh-overline">Selected account</p><h2>{active.name}</h2><p>{active.detail} · {months[start]}–{months[end]} 2025</p></div><div className="rh-review-values"><div><span>Ledger observed</span><strong>{money(active.observed[end])}</strong></div><div><span>Statement control</span><strong>{money(active.statement[end])}</strong></div><div><span>Ledger − statement</span><strong className={selectedDifference ? 'rh-difference' : ''}>{signedMoney(selectedDifference)}</strong></div></div><button className="rh-detail-button" onClick={() => setDetailOpen(!detailOpen)}>{detailOpen ? 'Hide' : 'About'} prototype evidence <span aria-hidden="true">↗</span></button></section>
        {detailOpen ? <section className="rh-evidence"><strong>{active.status === 'Difference' && selectedDifference ? 'Difference requires evidence' : 'Statement control aligned'}</strong><p>This prototype shows the chart-to-evidence transition. No transaction or original statement has been imported for these illustrative values; a real review must show the exact rows, statement page, and run receipt here.</p></section> : null}
      </main>
    </div>
  );
}
