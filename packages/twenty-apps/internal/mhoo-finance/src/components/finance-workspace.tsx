import styled from '@emotion/styled';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Button } from 'twenty-ui/input';

import {
  DEMO_QUESTIONS,
  demoMoney,
  demoReviewContextKey,
  demoTrace,
  initialDemoState,
  reduceDemo,
  resolveDemoQuestion,
  visibleDemoAttentionItems,
  type DemoRow,
  type DemoScenario,
  type DemoScope,
} from '../investigation/question-prototype';

type FinanceView = 'overview' | 'transactions' | 'statements' | 'accounts';
type ReviewDecision =
  | 'UNREVIEWED'
  | 'EVIDENCE_REQUEST_DRAFTED'
  | 'KEPT_UNCLASSIFIED'
  | 'REJECTED_CANDIDATE';

const NAV_ITEMS: readonly { id: FinanceView; label: string; glyph: string }[] =
  [
    { id: 'overview', label: 'Overview', glyph: '⌁' },
    { id: 'transactions', label: 'Transactions', glyph: '≡' },
    { id: 'statements', label: 'Statements', glyph: '▤' },
    { id: 'accounts', label: 'Accounts', glyph: '▣' },
  ];

type TimelineRow = DemoRow & { illustrativeHistory?: true };
type BrushKind = 'move' | 'start' | 'end';

// Explicitly invented interaction history. These rows remain separate from the
// seven demo-v1 source-backed fixture rows.
const ILLUSTRATIVE_HISTORY: readonly TimelineRow[] = [
  ['s1', '2025-03-07', 'Illustrative supplier payment', 'operating', '61000'],
  ['s2', '2025-03-21', 'Illustrative maintenance', 'reserve', '23000'],
  ['s3', '2025-04-09', 'Illustrative supplier payment', 'operating', '45000'],
  ['s4', '2025-04-24', 'Illustrative maintenance', 'reserve', '31000'],
  ['s5', '2025-05-06', 'Illustrative supplier payment', 'operating', '78000'],
  ['s6', '2025-05-23', 'Illustrative maintenance', 'reserve', '16000'],
  ['s7', '2025-06-10', 'Illustrative supplier payment', 'operating', '52000'],
  ['s8', '2025-06-25', 'Illustrative maintenance', 'reserve', '29000'],
  ['s9', '2025-07-08', 'Illustrative supplier payment', 'operating', '66000'],
  ['s10', '2025-07-23', 'Illustrative maintenance', 'reserve', '19000'],
  ['s11', '2025-08-11', 'Illustrative supplier payment', 'operating', '43000'],
  ['s12', '2025-08-22', 'Illustrative maintenance', 'reserve', '26000'],
].map(([id, date, description, account, outflowMinor], index) => ({
  id,
  date,
  description,
  account: account as DemoRow['account'],
  outflowMinor,
  sourceLine: 9 + index,
  sourceAvailable: false,
  includedInRealTotals: false,
  illustrativeHistory: true,
}));

const DAY_MS = 86_400_000;
const TIMELINE_EPOCH = Date.parse('2025-01-01T00:00:00Z');
const LAST_TIMELINE_DAY = 364;
const dayOfTimeline = (date: string) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - TIMELINE_EPOCH) / DAY_MS);
const timelineDate = (day: number) =>
  new Date(TIMELINE_EPOCH + day * DAY_MS).toISOString().slice(0, 10);
const readableDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const Workspace = styled.section({
  '--fw-canvas': 'var(--color-background-secondary, #f7f8fa)',
  '--fw-surface': 'var(--color-background-primary, #ffffff)',
  '--fw-nav': 'var(--color-background-tertiary, #edf0f4)',
  '--fw-text': 'var(--color-text-primary, #202938)',
  '--fw-muted': 'var(--color-text-secondary, #59677a)',
  '--fw-line': 'var(--color-border-secondary, #dfe4eb)',
  '--fw-accent': 'var(--color-text-info, #285ee7)',
  '--fw-soft': 'var(--color-background-info, #edf2ff)',
  '--fw-warn': 'var(--color-text-warning, #875413)',
  '--fw-warn-bg': 'var(--color-background-warning, #fff4e2)',
  color: 'var(--fw-text)',
  background: 'var(--fw-canvas)',
  border: '1px solid var(--fw-line)',
  borderRadius: '12px',
  overflow: 'hidden',
  minHeight: '760px',
  width: '100%',
  position: 'relative',
  isolation: 'isolate',
  fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
  fontSize: '13px',
  lineHeight: 1.45,
  boxSizing: 'border-box',
  '& *': { boxSizing: 'border-box' },
  '& button, & select, & input': { font: 'inherit' },
  '& button:disabled': { cursor: 'default', opacity: 0.5 },
  '& button:focus-visible, & select:focus-visible, & input:focus-visible, & summary:focus-visible':
    {
      outline:
        '3px solid color-mix(in srgb, var(--fw-accent) 42%, transparent)',
      outlineOffset: '2px',
    },
  '& .fw-chrome': {
    minHeight: '54px',
    display: 'flex',
    alignItems: 'center',
    gap: '13px',
    padding: '10px 18px',
    background: 'var(--fw-surface)',
    borderBottom: '1px solid var(--fw-line)',
  },
  '& .fw-logo': {
    color: 'var(--fw-accent)',
    fontSize: '22px',
    fontWeight: 750,
    letterSpacing: '-1.1px',
  },
  '& .fw-divider': {
    width: '1px',
    height: '19px',
    background: 'var(--fw-line)',
  },
  '& .fw-product': { fontSize: '12px', fontWeight: 650 },
  '& .fw-demo': {
    marginLeft: 'auto',
    border: '1px solid var(--fw-line)',
    borderRadius: '5px',
    padding: '4px 8px',
    color: 'var(--fw-muted)',
    fontSize: '10px',
    letterSpacing: '.2px',
  },
  '& .fw-layout': {
    display: 'grid',
    gridTemplateColumns: '166px minmax(0, 1fr)',
  },
  '& .fw-nav': {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '22px 10px',
    background: 'var(--fw-nav)',
    borderRight: '1px solid var(--fw-line)',
  },
  '& .fw-nav-label': {
    margin: '2px 11px 11px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
    fontWeight: 650,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  '& .fw-nav-button': {
    minHeight: '39px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 11px',
    border: 0,
    borderRadius: '6px',
    color: 'var(--fw-text)',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '11px',
  },
  '& .fw-nav-button:hover': { background: 'var(--fw-surface)' },
  '& .fw-nav-button[aria-current="page"]': {
    color: 'var(--fw-accent)',
    background: 'var(--fw-surface)',
    boxShadow: '0 1px 3px rgba(30, 45, 36, .05)',
  },
  '& .fw-nav-glyph': { width: '15px', textAlign: 'center', fontSize: '14px' },
  '& .fw-nav-meta': {
    margin: '28px 11px 0',
    color: 'var(--fw-muted)',
    fontSize: '9px',
    lineHeight: 1.55,
  },
  '& .fw-main': { minWidth: 0, padding: '23px 25px 19px' },
  '& .fw-top': {
    minHeight: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    marginBottom: '19px',
  },
  '& .fw-title': {
    margin: 0,
    color: 'var(--fw-text)',
    fontSize: '25px',
    fontWeight: 600,
    letterSpacing: '-.8px',
    lineHeight: 1.2,
  },
  '& .fw-controls': { display: 'flex', alignItems: 'center', gap: '7px' },
  '& .fw-select': {
    maxWidth: '190px',
    border: '1px solid var(--fw-line)',
    borderRadius: '6px',
    padding: '7px 9px',
    color: 'var(--fw-text)',
    background: 'var(--fw-surface)',
    fontSize: '11px',
  },
  '& .fw-metrics': {
    display: 'grid',
    gridTemplateColumns: '1.25fr 1fr 1fr',
    gap: '18px',
    paddingBottom: '21px',
    borderBottom: '1px solid var(--fw-line)',
  },
  '& .fw-label': { color: 'var(--fw-muted)', fontSize: '10px' },
  '& .fw-value': {
    margin: '4px 0 2px',
    fontSize: '30px',
    fontWeight: 560,
    letterSpacing: '-1px',
    lineHeight: 1.25,
    fontVariantNumeric: 'tabular-nums',
  },
  '& .fw-value small': {
    color: 'var(--fw-muted)',
    fontSize: '14px',
    fontWeight: 450,
    letterSpacing: 0,
  },
  '& .fw-sub': { color: 'var(--fw-muted)', fontSize: '9px' },
  '& .fw-warning': { color: 'var(--fw-warn)' },
  '& .fw-overview': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.45fr) minmax(240px, 1fr)',
    gap: '24px',
    padding: '21px 0',
    borderBottom: '1px solid var(--fw-line)',
  },
  '& .fw-section-head': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '14px',
  },
  '& .fw-heading': { margin: 0, fontSize: '13px', fontWeight: 600 },
  '& .fw-mini': {
    border: '1px solid var(--fw-line)',
    borderRadius: '4px',
    padding: '3px 6px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-chart': {
    height: '158px',
    display: 'grid',
    gridTemplateColumns: '32px repeat(2, minmax(75px, 1fr))',
    gap: '16px',
    paddingTop: '4px',
  },
  '& .fw-axis': {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '11px 0 25px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
    textAlign: 'right',
  },
  '& .fw-month': {
    height: '100%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 10px',
    border: 0,
    borderRadius: '5px',
    color: 'var(--fw-text)',
    background: 'transparent',
    cursor: 'pointer',
  },
  '& .fw-month:hover, & .fw-month[aria-pressed="true"]': {
    background: 'var(--fw-soft)',
  },
  '& .fw-month-value': {
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  '& .fw-column': {
    width: '72%',
    maxWidth: '92px',
    minHeight: '2px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: '4px 4px 0 0',
    background: 'var(--fw-accent)',
    transition: 'height 180ms ease',
  },
  '& .fw-segment': {
    display: 'block',
    width: '100%',
    minHeight: '1px',
    borderBottom: '1px solid var(--fw-surface)',
  },
  '& .fw-segment:nth-of-type(even)': { opacity: 0.72 },
  '& .fw-segment[data-missing="true"]': {
    opacity: 1,
    background:
      'repeating-linear-gradient(135deg, #edbb73 0 4px, #f9dca9 4px 8px)',
  },
  '& .fw-month-label': {
    paddingTop: '7px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-chart-key': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-hatch': {
    width: '12px',
    height: '8px',
    border: '1px solid #c8954b',
    background:
      'repeating-linear-gradient(135deg, #edbb73 0 3px, #f9dca9 3px 6px)',
  },
  '& .fw-insight': {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginTop: '13px',
    padding: '10px 11px',
    border: 0,
    borderRadius: '6px',
    color: 'var(--fw-accent)',
    background: 'var(--fw-soft)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '10px',
  },
  '& .fw-attention': {
    paddingLeft: '22px',
    borderLeft: '1px solid var(--fw-line)',
  },
  '& .fw-queue': { display: 'grid' },
  '& .fw-queue-row': {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '4px 8px',
    padding: '11px 0',
    border: 0,
    borderTop: '1px solid var(--fw-line)',
    color: 'var(--fw-text)',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
  },
  '& .fw-queue-row:hover': { color: 'var(--fw-accent)' },
  '& .fw-queue-title': { minWidth: 0, fontSize: '10px', fontWeight: 600 },
  '& .fw-amount': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  '& .fw-queue-reason': {
    gridColumn: '1 / -1',
    color: 'var(--fw-warn)',
    fontSize: '9px',
  },
  '& .fw-queue-foot': {
    paddingTop: '9px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-table-head': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '17px 0 10px',
  },
  '& .fw-link': {
    padding: '4px',
    border: 0,
    color: 'var(--fw-accent)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '9px',
  },
  '& .fw-table-wrap': { minWidth: 0, overflowX: 'auto' },
  '& .fw-table': {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    background: 'var(--fw-surface)',
    fontSize: '10px',
  },
  '& .fw-table th': {
    padding: '8px 9px',
    borderTop: '1px solid var(--fw-line)',
    borderBottom: '1px solid var(--fw-line)',
    color: 'var(--fw-muted)',
    background: 'var(--fw-nav)',
    fontSize: '9px',
    fontWeight: 550,
    textAlign: 'left',
  },
  '& .fw-table td': {
    height: '42px',
    padding: '8px 9px',
    borderBottom: '1px solid var(--fw-line)',
    verticalAlign: 'middle',
    overflowWrap: 'anywhere',
  },
  '& .fw-table tbody tr': { cursor: 'pointer' },
  '& .fw-table tbody tr:hover td': { background: 'var(--fw-soft)' },
  '& .fw-check-col': { width: '34px' },
  '& .fw-date-col': { width: '13%' },
  '& .fw-account-col': { width: '16%' },
  '& .fw-evidence-col': { width: '19%' },
  '& .fw-money-col': { width: '14%', textAlign: 'right !important' },
  '& .fw-checkbox': {
    width: '14px',
    height: '14px',
    display: 'inline-block',
    border: '1px solid var(--fw-line)',
    borderRadius: '3px',
    background: 'var(--fw-surface)',
  },
  '& .fw-status': {
    display: 'inline-flex',
    padding: '3px 6px',
    borderRadius: '4px',
    color: 'var(--fw-muted)',
    background: 'var(--fw-nav)',
    fontSize: '8px',
    lineHeight: 1.35,
  },
  '& .fw-status[data-tone="warn"]': {
    color: 'var(--fw-warn)',
    background: 'var(--fw-warn-bg)',
  },
  '& .fw-actions': {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginBottom: '13px',
  },
  '& .fw-button': {
    minHeight: '33px',
    padding: '7px 10px',
    border: '1px solid var(--fw-line)',
    borderRadius: '6px',
    color: 'var(--fw-text)',
    background: 'var(--fw-surface)',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 550,
  },
  '& .fw-button:hover': { background: 'var(--fw-soft)' },
  '& .fw-button[aria-pressed="true"]': {
    color: 'var(--fw-accent)',
    borderColor: 'var(--fw-accent)',
  },
  '& .fw-primary': {
    color: '#fff',
    borderColor: 'var(--fw-accent)',
    background: 'var(--fw-accent)',
  },
  '& .fw-primary:hover': {
    filter: 'brightness(.96)',
    background: 'var(--fw-accent)',
  },
  '& .fw-account-picker': { marginLeft: 'auto', minWidth: '240px' },
  '& .fw-page-note': {
    margin: '-8px 0 17px',
    color: 'var(--fw-muted)',
    fontSize: '10px',
  },
  '& .fw-panels': {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  '& .fw-panel': {
    minWidth: 0,
    padding: '16px',
    border: '1px solid var(--fw-line)',
    borderRadius: '7px',
    background: 'var(--fw-surface)',
  },
  '& .fw-panel-top': {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'flex-start',
    marginBottom: '13px',
  },
  '& .fw-panel-title': { margin: 0, fontSize: '12px', fontWeight: 600 },
  '& .fw-definition': {
    display: 'grid',
    gridTemplateColumns: '100px minmax(0, 1fr)',
    gap: '8px 12px',
    margin: 0,
    paddingTop: '12px',
    borderTop: '1px solid var(--fw-line)',
    fontSize: '10px',
  },
  '& .fw-definition dt': { color: 'var(--fw-muted)' },
  '& .fw-definition dd': { margin: 0 },
  '& .fw-empty': {
    padding: '38px 16px',
    color: 'var(--fw-muted)',
    textAlign: 'center',
    fontSize: '11px',
  },
  '& .fw-bottom': {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    paddingTop: '15px',
    color: 'var(--fw-muted)',
    fontSize: '8px',
  },
  '& .fw-details': {
    marginTop: '13px',
    paddingTop: '11px',
    borderTop: '1px solid var(--fw-line)',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-details summary': { cursor: 'pointer', fontWeight: 600 },
  '& .fw-details p': { margin: '8px 0 0', lineHeight: 1.55 },
  '& .fw-window-tools': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '10px',
  },
  '& .fw-date-fields': { display: 'flex', alignItems: 'center', gap: '8px' },
  '& .fw-date-field': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-date-input': {
    minHeight: '31px',
    border: '1px solid var(--fw-line)',
    borderRadius: '5px',
    padding: '5px 7px',
    color: 'var(--fw-text)',
    background: 'var(--fw-surface)',
    fontSize: '10px',
  },
  '& .fw-brush': {
    height: '47px',
    position: 'relative',
    margin: '0 13px',
    border: '1px solid var(--fw-line)',
    borderRadius: '5px',
    background: 'var(--fw-nav)',
    touchAction: 'none',
    userSelect: 'none',
  },
  '& .fw-brush-bars': {
    position: 'absolute',
    inset: '7px 0',
    display: 'flex',
    alignItems: 'end',
    pointerEvents: 'none',
  },
  '& .fw-brush-bar': {
    flex: 1,
    minHeight: '1px',
    margin: '0 2%',
    background: 'var(--fw-line)',
  },
  '& .fw-window-selection': {
    position: 'absolute',
    insetBlock: '-1px',
    zIndex: 1,
    padding: 0,
    border: '1px solid var(--fw-accent)',
    borderRadius: '4px',
    background: 'var(--fw-soft)',
    opacity: 0.78,
    cursor: 'grab',
  },
  '& .fw-window-selection:active': { cursor: 'grabbing' },
  '& .fw-window-handle': {
    position: 'absolute',
    insetBlock: '-1px',
    zIndex: 2,
    width: '26px',
    marginLeft: '-13px',
    padding: 0,
    border: '1px solid var(--fw-accent)',
    borderRadius: '4px',
    color: 'var(--fw-accent)',
    background: 'var(--fw-surface)',
    cursor: 'ew-resize',
    textAlign: 'center',
    fontSize: '16px',
  },
  '& .fw-month-labels': {
    display: 'flex',
    justifyContent: 'space-around',
    margin: '6px 0 3px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-brush-note': {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
    margin: '8px 0 22px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-insights-layout': {
    display: 'grid',
    gridTemplateColumns: '190px minmax(0, 1fr)',
    gap: '30px',
  },
  '& .fw-selected-money': {
    margin: '4px 0 5px',
    fontSize: '34px',
    fontWeight: 520,
    letterSpacing: '-1.1px',
    lineHeight: 1.25,
    fontVariantNumeric: 'tabular-nums',
  },
  '& .fw-recap': { display: 'grid', gap: '21px', marginTop: '25px' },
  '& .fw-recap-button': {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '13px minmax(0, 1fr)',
    gap: '7px',
    padding: 0,
    border: 0,
    color: 'var(--fw-text)',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '10px',
    lineHeight: 1.5,
  },
  '& .fw-recap-button strong': {
    display: 'block',
    marginBottom: '3px',
    fontWeight: 600,
  },
  '& .fw-chart-stats': {
    display: 'flex',
    gap: '28px',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  '& .fw-chart-stat strong': {
    display: 'block',
    marginTop: '3px',
    fontSize: '17px',
    fontWeight: 520,
  },
  '& .fw-line-chart': {
    display: 'block',
    width: '100%',
    height: '250px',
    overflow: 'visible',
  },
  '& .fw-line-chart text': {
    fill: 'var(--fw-muted)',
    font: '9px Inter, system-ui, sans-serif',
  },
  '& .fw-line-chart-grid': {
    stroke: 'var(--fw-line)',
    strokeWidth: 1,
    strokeDasharray: '2 4',
  },
  '& .fw-line-chart-path': {
    fill: 'none',
    stroke: 'var(--fw-accent)',
    strokeWidth: 2.2,
  },
  '& .fw-line-chart-dot': {
    fill: 'var(--fw-accent)',
    stroke: 'var(--fw-surface)',
    strokeWidth: 2,
  },
  '& .fw-overview-foot': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '15px',
    borderTop: '1px solid var(--fw-line)',
  },
  '& .fw-shade': {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    background: 'rgba(16, 24, 40, .24)',
  },
  '& .fw-drawer': {
    position: 'absolute',
    inset: '0 0 0 auto',
    zIndex: 4,
    width: 'min(430px, 100%)',
    overflowY: 'auto',
    padding: '23px',
    borderLeft: '1px solid var(--fw-line)',
    background: 'var(--fw-surface)',
    boxShadow: '-12px 0 40px rgba(24, 35, 29, .10)',
  },
  '& .fw-drawer-top': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '23px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-close': {
    border: 0,
    color: 'var(--fw-muted)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '20px',
  },
  '& .fw-drawer-title': {
    margin: '9px 0 0',
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-.5px',
  },
  '& .fw-drawer-value': {
    margin: '10px 0 3px',
    fontSize: '34px',
    letterSpacing: '-1px',
    fontVariantNumeric: 'tabular-nums',
  },
  '& .fw-reason': {
    margin: '19px 0',
    padding: '12px',
    borderRadius: '6px',
    color: 'var(--fw-warn)',
    background: 'var(--fw-warn-bg)',
    fontSize: '10px',
    lineHeight: 1.5,
  },
  '& .fw-raw': {
    margin: '12px 0',
    padding: '11px',
    border: '1px solid var(--fw-line)',
    borderRadius: '5px',
    background: 'var(--fw-canvas)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    font: '9px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  '& .fw-drawer-actions': { display: 'grid', gap: '7px', marginTop: '18px' },
  '& .fw-drawer-actions .fw-button': { width: '100%', textAlign: 'center' },
  '& .fw-local': {
    marginTop: '9px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
    lineHeight: 1.5,
  },
  '@media (max-width: 850px)': {
    '& .fw-layout': { gridTemplateColumns: '136px minmax(0, 1fr)' },
    '& .fw-main': { padding: '20px 17px' },
    '& .fw-overview': { gridTemplateColumns: '1fr' },
    '& .fw-attention': { paddingLeft: 0, borderLeft: 0 },
    '& .fw-value': { fontSize: '25px' },
    '& .fw-account-col': { display: 'none' },
    '& .fw-insights-layout': {
      gridTemplateColumns: '165px minmax(0, 1fr)',
      gap: '20px',
    },
  },
  '@media (max-width: 580px)': {
    minHeight: 0,
    '& .fw-layout': { display: 'block' },
    '& .fw-nav': {
      flexDirection: 'row',
      overflowX: 'auto',
      padding: '7px',
      borderRight: 0,
      borderBottom: '1px solid var(--fw-line)',
    },
    '& .fw-nav-label, & .fw-nav-meta, & .fw-nav-glyph': { display: 'none' },
    '& .fw-nav-button': {
      width: 'auto',
      flex: '0 0 auto',
      minHeight: '44px',
      padding: '9px',
    },
    '& .fw-main': { padding: '17px 14px' },
    '& .fw-top': { alignItems: 'flex-start', flexWrap: 'wrap' },
    '& .fw-controls': { width: '100%' },
    '& .fw-select': {
      minHeight: '44px',
      flex: 1,
      minWidth: 0,
      maxWidth: 'none',
      fontSize: '16px',
    },
    '& .fw-metrics': { gridTemplateColumns: '1.15fr .85fr 1fr', gap: '9px' },
    '& .fw-value': { fontSize: '21px' },
    '& .fw-value small': { display: 'block', fontSize: '9px' },
    '& .fw-chart': {
      gridTemplateColumns: '28px repeat(2, minmax(62px, 1fr))',
      gap: '7px',
    },
    '& .fw-panels': { gridTemplateColumns: '1fr' },
    '& .fw-date-col, & .fw-date-cell, & .fw-account-col, & .fw-account-cell': {
      display: 'none',
    },
    '& .fw-evidence-col': { width: '28%' },
    '& .fw-money-col': { width: '22%' },
    '& .fw-actions': { flexWrap: 'wrap' },
    '& .fw-account-picker': { marginLeft: 0, minWidth: 0, width: '100%' },
    '& .fw-bottom': { flexWrap: 'wrap' },
    '& .fw-drawer': { padding: '19px' },
    '& .fw-date-fields': { width: '100%' },
    '& .fw-date-field': { flex: 1 },
    '& .fw-date-input': {
      minHeight: '44px',
      minWidth: 0,
      width: '100%',
      fontSize: '16px',
    },
    '& .fw-brush': { marginInline: '22px' },
    '& .fw-window-handle': { width: '44px', marginLeft: '-22px' },
    '& .fw-month-labels span:nth-of-type(even)': { visibility: 'hidden' },
    '& .fw-insights-layout': { display: 'flex', flexDirection: 'column' },
    '& .fw-recap': {
      gridTemplateColumns: '1fr',
      gap: '14px',
      marginTop: '15px',
    },
    '& .fw-line-chart': { height: '230px' },
  },
  '@media (pointer: coarse)': {
    '& .fw-window-handle': { width: '44px', marginLeft: '-22px' },
    '& .fw-brush': { marginInline: '22px' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& *': { transition: 'none !important' },
  },
});

export const FinanceWorkspace = ({ onExit }: { onExit?: () => void }) => {
  const [state, dispatch] = useReducer(reduceDemo, initialDemoState);
  const [view, setView] = useState<FinanceView>('overview');
  const [selectedAttentionId, setSelectedAttentionId] = useState<string | null>(
    null,
  );
  const [reviewDecision, setReviewDecision] =
    useState<ReviewDecision>('UNREVIEWED');
  const [rangeStart, setRangeStart] = useState('2025-01-01');
  const [rangeEnd, setRangeEnd] = useState('2025-06-30');
  const [selectedIllustrative, setSelectedIllustrative] =
    useState<TimelineRow | null>(null);
  const [transactionSearch, setTransactionSearch] = useState('');
  const requestSequence = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dragState = useRef<{
    kind: BrushKind;
    x: number;
    width: number;
    start: number;
    end: number;
  } | null>(null);

  const request = (
    scope: DemoScope,
    question: string,
    scenario: DemoScenario,
  ) => {
    const id = ++requestSequence.current;
    dispatch({ type: 'request', id, scope, question, scenario });
    const timer = setTimeout(
      () =>
        dispatch({
          type: 'resolved',
          id,
          result: resolveDemoQuestion(scope, question, scenario),
        }),
      scenario === 'slow' ? 2400 : 250,
    );
    timers.current.push(timer);
  };

  useEffect(() => {
    request(initialDemoState.scope, DEMO_QUESTIONS[0], 'normal');
    return () => {
      for (const timer of timers.current) clearTimeout(timer);
    };
  }, []);

  const result = state.result;
  const sourceRows =
    result?.status === 'ready'
      ? result.rows.filter(
          (row) =>
            row.date >= rangeStart &&
            row.date <= rangeEnd &&
            (state.scope.account === 'all' ||
              row.account === state.scope.account),
        )
      : [];
  const historyRows =
    result?.status === 'ready'
      ? ILLUSTRATIVE_HISTORY.filter(
          (row) =>
            row.date >= rangeStart &&
            row.date <= rangeEnd &&
            (state.scope.account === 'all' ||
              row.account === state.scope.account),
        )
      : [];
  const rows: TimelineRow[] = [...sourceRows, ...historyRows].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const attentionItems = visibleDemoAttentionItems(result, sourceRows);
  const trace = demoTrace(state);
  const drawerRow = trace?.row ?? selectedIllustrative;
  const reviewContextKey = demoReviewContextKey(
    selectedAttentionId,
    drawerRow?.id ?? null,
    trace?.snapshot ?? state.scope.snapshot,
  );
  const selectedRowFlags = drawerRow
    ? attentionItems.filter((item) => item.contributingRowId === drawerRow.id)
    : [];
  const uniqueAttentionRows = Array.from(
    new Map(
      attentionItems.map((item) => [
        item.contributingRowId,
        {
          row: sourceRows.find((row) => row.id === item.contributingRowId),
          items: attentionItems.filter(
            (candidate) =>
              candidate.contributingRowId === item.contributingRowId,
          ),
        },
      ]),
    ).values(),
  ).filter((item) => item.row !== undefined);
  const selectedTotal = rows.reduce(
    (sum, row) => sum + BigInt(row.outflowMinor),
    0n,
  );
  const operatingTotal = rows
    .filter((row) => row.account === 'operating')
    .reduce((sum, row) => sum + BigInt(row.outflowMinor), 0n);
  const reserveTotal = rows
    .filter((row) => row.account === 'reserve')
    .reduce((sum, row) => sum + BigInt(row.outflowMinor), 0n);
  const largestRow = rows.reduce<TimelineRow | null>(
    (largest, row) =>
      !largest || BigInt(largest.outflowMinor) < BigInt(row.outflowMinor)
        ? row
        : largest,
    null,
  );
  let cumulativeMinor = 0n;
  const chartPoints = rows.map((row) => {
    cumulativeMinor += BigInt(row.outflowMinor);
    return { row, cumulativeMinor };
  });
  const chartMaximum = selectedTotal > 0n ? Number(selectedTotal) * 1.15 : 1;
  const chartSpan = Math.max(
    1,
    dayOfTimeline(rangeEnd) - dayOfTimeline(rangeStart),
  );
  const chartX = (date: string) =>
    64 + ((dayOfTimeline(date) - dayOfTimeline(rangeStart)) / chartSpan) * 521;
  const chartY = (value: bigint) => 220 - (Number(value) / chartMaximum) * 193;
  const chartPath = chartPoints
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${chartX(point.row.date)},${chartY(point.cumulativeMinor)}`,
    )
    .join(' ');
  const chartAreaPath = chartPoints.length
    ? `${chartPath} L${chartX(chartPoints.at(-1)!.row.date)},220 L64,220 Z`
    : '';
  const monthlyTotals = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    return [
      ...(result?.status === 'ready' ? result.rows : []),
      ...ILLUSTRATIVE_HISTORY,
    ]
      .filter(
        (row) =>
          row.date.slice(5, 7) === month &&
          (state.scope.account === 'all' ||
            row.account === state.scope.account),
      )
      .reduce((sum, row) => sum + Number(row.outflowMinor), 0);
  });
  const maximumMonth = Math.max(1, ...monthlyTotals);
  const pageTitle =
    NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Finance';

  useEffect(() => setReviewDecision('UNREVIEWED'), [reviewContextKey]);
  useEffect(() => {
    if (
      selectedAttentionId &&
      !attentionItems.some((item) => item.id === selectedAttentionId)
    )
      setSelectedAttentionId(null);
  }, [attentionItems, selectedAttentionId]);
  useEffect(() => {
    if (drawerRow) closeButton.current?.focus();
  }, [drawerRow?.id]);

  const clearDrawer = (restoreFocus: boolean) => {
    dispatch({ type: 'row', id: null });
    setSelectedIllustrative(null);
    setSelectedAttentionId(null);
    if (restoreFocus) requestAnimationFrame(() => returnFocus.current?.focus());
  };
  const closeDrawer = () => clearDrawer(true);
  const changeScope = (patch: Partial<DemoScope>) => {
    clearDrawer(false);
    request({ ...state.scope, ...patch }, state.question, state.scenario);
  };
  const switchView = (nextView: FinanceView) => {
    setView(nextView);
    if (
      nextView === 'accounts' &&
      (state.scope.account !== 'all' || state.scope.period !== 'comparison')
    ) {
      request(
        { ...state.scope, account: 'all', period: 'comparison' },
        state.question,
        state.scenario,
      );
    } else if (
      nextView !== 'statements' &&
      state.scope.period !== 'comparison'
    ) {
      request(
        { ...state.scope, period: 'comparison' },
        state.question,
        state.scenario,
      );
    }
  };
  const openRow = (
    rowId: string,
    attentionId: string | null,
    sourceElement: EventTarget | null,
  ) => {
    returnFocus.current =
      sourceElement instanceof HTMLElement ? sourceElement : null;
    setSelectedAttentionId(attentionId);
    const illustrative = historyRows.find((row) => row.id === rowId);
    if (illustrative) {
      dispatch({ type: 'row', id: null });
      setSelectedIllustrative(illustrative);
    } else {
      setSelectedIllustrative(null);
      dispatch({ type: 'row', id: rowId });
    }
  };
  const transactionRows = rows.filter((row) =>
    row.description.toLowerCase().includes(transactionSearch.toLowerCase()),
  );
  const displayRows =
    view === 'transactions' ? transactionRows : transactionRows.slice(0, 7);

  const changeWindow = (
    kind: BrushKind,
    delta: number,
    initialStart = dayOfTimeline(rangeStart),
    initialEnd = dayOfTimeline(rangeEnd),
  ) => {
    let nextStart = initialStart;
    let nextEnd = initialEnd;
    if (kind === 'move') {
      const boundedDelta = Math.max(
        -initialStart,
        Math.min(LAST_TIMELINE_DAY - initialEnd, delta),
      );
      nextStart += boundedDelta;
      nextEnd += boundedDelta;
    } else if (kind === 'start') {
      nextStart = Math.max(0, Math.min(initialEnd, initialStart + delta));
    } else {
      nextEnd = Math.max(
        initialStart,
        Math.min(LAST_TIMELINE_DAY, initialEnd + delta),
      );
    }
    setRangeStart(timelineDate(nextStart));
    setRangeEnd(timelineDate(nextEnd));
    if (drawerRow) clearDrawer(false);
  };

  const startBrushDrag = (
    kind: BrushKind,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const brush = event.currentTarget.parentElement;
    if (!brush) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      kind,
      x: event.clientX,
      width: brush.getBoundingClientRect().width,
      start: dayOfTimeline(rangeStart),
      end: dayOfTimeline(rangeEnd),
    };
  };

  const moveBrushDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag) return;
    changeWindow(
      drag.kind,
      Math.round(((event.clientX - drag.x) / drag.width) * 365),
      drag.start,
      drag.end,
    );
  };

  const endBrushDrag = () => {
    dragState.current = null;
  };

  const brushKey = (
    kind: BrushKind,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = kind === 'move' || event.shiftKey ? 7 : 1;
    changeWindow(kind, event.key === 'ArrowRight' ? step : -step);
  };

  const table = (tableRows = displayRows) => (
    <div className="fw-table-wrap">
      <table className="fw-table">
        <thead>
          <tr>
            <th className="fw-check-col">
              <span className="fw-checkbox" />
            </th>
            <th className="fw-date-col">Date</th>
            <th>Description</th>
            <th className="fw-account-col">Account</th>
            <th className="fw-evidence-col">Evidence</th>
            <th className="fw-money-col">Paid out</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              onClick={(event) => openRow(row.id, null, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openRow(row.id, null, event.currentTarget);
                }
              }}
            >
              <td>
                <span className="fw-checkbox" />
              </td>
              <td className="fw-date-cell">{row.date}</td>
              <td>
                <strong>{row.description}</strong>
              </td>
              <td className="fw-account-cell">{row.account}</td>
              <td>
                <span
                  className="fw-status"
                  data-tone={row.sourceAvailable ? 'ok' : 'warn'}
                >
                  {row.illustrativeHistory
                    ? 'Illustrative · no source'
                    : row.sourceAvailable
                      ? 'Excerpt available'
                      : 'Missing excerpt'}
                </span>
              </td>
              <td className="fw-money-col">{demoMoney(row.outflowMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const unavailable = (
    <div className="fw-empty" role="status">
      {state.loading
        ? 'Refreshing this scope…'
        : result?.status === 'empty'
          ? 'No matching demo records in this scope.'
          : 'No records returned. Nothing has been inferred.'}
    </div>
  );

  const overview = (
    <>
      {state.loading || result?.status !== 'ready' ? (
        unavailable
      ) : (
        <>
          <div className="fw-window-tools">
            <div className="fw-date-fields">
              <label className="fw-date-field">
                From
                <input
                  className="fw-date-input"
                  type="date"
                  aria-label="Window start"
                  min="2025-01-01"
                  max={rangeEnd}
                  value={rangeStart}
                  onChange={(event) => {
                    if (event.target.value && event.target.value <= rangeEnd) {
                      setRangeStart(event.target.value);
                      if (drawerRow) clearDrawer(false);
                    }
                  }}
                />
              </label>
              <label className="fw-date-field">
                To
                <input
                  className="fw-date-input"
                  type="date"
                  aria-label="Window end"
                  min={rangeStart}
                  max="2025-12-31"
                  value={rangeEnd}
                  onChange={(event) => {
                    if (
                      event.target.value &&
                      event.target.value >= rangeStart
                    ) {
                      setRangeEnd(event.target.value);
                      if (drawerRow) clearDrawer(false);
                    }
                  }}
                />
              </label>
            </div>
            <span className="fw-label">Inclusive · transaction dates</span>
          </div>
          <div className="fw-brush" aria-label="Selected date window">
            <div className="fw-brush-bars" aria-hidden="true">
              {monthlyTotals.map((total, index) => (
                <span
                  className="fw-brush-bar"
                  key={index}
                  style={{ height: `${(total / maximumMonth) * 100}%` }}
                />
              ))}
            </div>
            <button
              type="button"
              className="fw-window-selection"
              aria-label="Move selected date window. Left or right arrow moves seven days."
              style={{
                left: `${(dayOfTimeline(rangeStart) / 365) * 100}%`,
                width: `${((dayOfTimeline(rangeEnd) - dayOfTimeline(rangeStart) + 1) / 365) * 100}%`,
              }}
              onPointerDown={(event) => startBrushDrag('move', event)}
              onPointerMove={moveBrushDrag}
              onPointerUp={endBrushDrag}
              onPointerCancel={endBrushDrag}
              onKeyDown={(event) => brushKey('move', event)}
            />
            {(['start', 'end'] as const).map((kind) => (
              <button
                type="button"
                className="fw-window-handle"
                key={kind}
                aria-label={`Resize window ${kind}. Arrow keys change one day, Shift changes seven days.`}
                style={{
                  left: `${((dayOfTimeline(kind === 'start' ? rangeStart : rangeEnd) + (kind === 'end' ? 1 : 0)) / 365) * 100}%`,
                }}
                onPointerDown={(event) => startBrushDrag(kind, event)}
                onPointerMove={moveBrushDrag}
                onPointerUp={endBrushDrag}
                onPointerCancel={endBrushDrag}
                onKeyDown={(event) => brushKey(kind, event)}
              >
                ‖
              </button>
            ))}
          </div>
          <div className="fw-month-labels" aria-hidden="true">
            {[
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ].map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
          <div className="fw-brush-note">
            <span>Drag window to move · drag edges to resize</span>
            <span>2025 synthetic history · Sep–Dec has no records</span>
          </div>
          <section
            className="fw-insights-layout"
            aria-label="Selected interval summary"
          >
            <div>
              <span className="fw-label">Selected outflow · synthetic</span>
              <div className="fw-selected-money">
                {rows.length
                  ? demoMoney(selectedTotal.toString())
                  : 'No records'}
              </div>
              <div className="fw-sub" aria-live="polite">
                {readableDate(rangeStart)} – {readableDate(rangeEnd)} ·{' '}
                {rows.length} records
              </div>
              <div className="fw-recap">
                {largestRow ? (
                  <button
                    type="button"
                    className="fw-recap-button"
                    onClick={(event) =>
                      openRow(largestRow.id, null, event.currentTarget)
                    }
                  >
                    <span aria-hidden="true">↗</span>
                    <span>
                      <strong>
                        {demoMoney(largestRow.outflowMinor)} largest movement
                      </strong>
                      <span className="fw-sub">
                        {largestRow.description} ·{' '}
                        {readableDate(largestRow.date)}
                      </span>
                    </span>
                  </button>
                ) : null}
                {sourceRows.some((row) => !row.sourceAvailable) ? (
                  <button
                    type="button"
                    className="fw-recap-button"
                    onClick={(event) =>
                      openRow('d6', 'missing-evidence', event.currentTarget)
                    }
                  >
                    <span aria-hidden="true">↳</span>
                    <span>
                      <strong className="fw-warning">
                        Source excerpt missing
                      </strong>
                      <span className="fw-sub">
                        The $360 movement stays unclassified.
                      </span>
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="fw-recap-button"
                  onClick={() => switchView('transactions')}
                >
                  <span aria-hidden="true">↳</span>
                  <span>
                    <strong>
                      {uniqueAttentionRows.length} transactions need review
                    </strong>
                    <span className="fw-sub">
                      Within the selected account and dates.
                    </span>
                  </span>
                </button>
              </div>
            </div>
            <div>
              <div className="fw-chart-stats">
                <div className="fw-chart-stat">
                  <span className="fw-label">Operating outflow</span>
                  <strong>
                    {rows.length ? demoMoney(operatingTotal.toString()) : '—'}
                  </strong>
                </div>
                <div className="fw-chart-stat">
                  <span className="fw-label">Reserve outflow</span>
                  <strong>
                    {rows.length ? demoMoney(reserveTotal.toString()) : '—'}
                  </strong>
                </div>
                <div className="fw-chart-stat">
                  <span className="fw-label">Income / profit</span>
                  <strong className="fw-label">Not modeled</strong>
                </div>
              </div>
              <svg
                className="fw-line-chart"
                viewBox="0 0 600 250"
                role="img"
                aria-label={
                  rows.length
                    ? `${readableDate(rangeStart)} through ${readableDate(rangeEnd)}, ${rows.length} synthetic records, cumulative outflow ${demoMoney(selectedTotal.toString())}`
                    : `${readableDate(rangeStart)} through ${readableDate(rangeEnd)}, no records in this interval`
                }
              >
                <defs>
                  <linearGradient
                    id="fw-chart-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity=".11"
                    />
                    <stop
                      offset="100%"
                      stopColor="currentColor"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map((fraction) => {
                  const value = BigInt(Math.round(chartMaximum * fraction));
                  const y = chartY(value);
                  return (
                    <g key={fraction}>
                      <line
                        className="fw-line-chart-grid"
                        x1="64"
                        x2="585"
                        y1={y}
                        y2={y}
                      />
                      <text x="55" y={y + 4} textAnchor="end">
                        {rows.length ? demoMoney(value.toString()) : '—'}
                      </text>
                    </g>
                  );
                })}
                <text x="64" y="15">
                  Outflow (USD)
                </text>
                {chartAreaPath ? (
                  <path
                    d={chartAreaPath}
                    fill="url(#fw-chart-fill)"
                    style={{ color: 'var(--fw-accent)' }}
                  />
                ) : null}
                {chartPath ? (
                  <path className="fw-line-chart-path" d={chartPath} />
                ) : null}
                {chartPoints.map((point) => (
                  <circle
                    className="fw-line-chart-dot"
                    key={point.row.id}
                    cx={chartX(point.row.date)}
                    cy={chartY(point.cumulativeMinor)}
                    r="3"
                  />
                ))}
                {!chartPoints.length ? (
                  <text x="325" y="125" textAnchor="middle">
                    No records in this interval
                  </text>
                ) : null}
                <text x="64" y="241">
                  {rangeStart.slice(5)}
                </text>
                <text x="585" y="241" textAnchor="end">
                  {rangeEnd.slice(5)}
                </text>
              </svg>
              <div className="fw-chart-key">
                <span style={{ color: 'var(--fw-accent)' }}>—</span>Cumulative
                selected outflows · USD{' '}
                <span style={{ marginLeft: 'auto' }}>
                  No balance is represented
                </span>
              </div>
            </div>
          </section>
          <div className="fw-overview-foot">
            <span className="fw-sub">
              Jan–Feb: 7 demo-v1 rows · Mar–Aug: invented interaction examples
            </span>
            <button
              type="button"
              className="fw-link"
              onClick={() => switchView('transactions')}
            >
              Explore contributing transactions →
            </button>
          </div>
        </>
      )}
    </>
  );

  const transactions = (
    <>
      <p className="fw-page-note">
        Working list · evidence status stays beside each transaction.
      </p>
      <div className="fw-window-tools">
        <div className="fw-date-fields">
          <label className="fw-date-field">
            From
            <input
              className="fw-date-input"
              type="date"
              aria-label="Transaction window start"
              min="2025-01-01"
              max={rangeEnd}
              value={rangeStart}
              onChange={(event) =>
                event.target.value &&
                event.target.value <= rangeEnd &&
                setRangeStart(event.target.value)
              }
            />
          </label>
          <label className="fw-date-field">
            To
            <input
              className="fw-date-input"
              type="date"
              aria-label="Transaction window end"
              min={rangeStart}
              max="2025-12-31"
              value={rangeEnd}
              onChange={(event) =>
                event.target.value &&
                event.target.value >= rangeStart &&
                setRangeEnd(event.target.value)
              }
            />
          </label>
        </div>
        <span className="fw-label">
          {rows.length} transactions in the inclusive window
        </span>
      </div>
      <div className="fw-actions">
        <button type="button" className="fw-button" disabled>
          Export fixture
        </button>
        <button type="button" className="fw-button" disabled>
          Request paperwork
        </button>
        <select
          className="fw-select fw-account-picker"
          aria-label="Transaction account"
          value={state.scope.account}
          onChange={(event) =>
            changeScope({
              account: event.target.value as DemoScope['account'],
              period: 'comparison',
            })
          }
        >
          <option value="all">All accounts</option>
          <option value="operating">Operating</option>
          <option value="reserve">Reserve</option>
        </select>
        <input
          className="fw-date-input"
          aria-label="Search transactions"
          placeholder="Search"
          value={transactionSearch}
          onChange={(event) => setTransactionSearch(event.target.value)}
        />
      </div>
      {transactionRows.length ? table(transactionRows) : unavailable}
    </>
  );

  const statements = (
    <>
      <p className="fw-page-note">
        Statement coverage is separate from transaction excerpts.
      </p>
      <div className="fw-actions">
        <button type="button" className="fw-button" disabled>
          Add statement
        </button>
        <span className="fw-label">
          No original statement files are present in this demonstration.
        </span>
      </div>
      <div className="fw-table-wrap">
        <table className="fw-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Account scope</th>
              <th>Observed rows</th>
              <th>Outflow</th>
              <th>Statement control</th>
            </tr>
          </thead>
          <tbody>
            {(result?.groups ?? []).map((group) => (
              <tr key={group.month}>
                <td>
                  <strong>{group.label} 2025</strong>
                </td>
                <td>
                  {state.scope.account === 'all'
                    ? 'All accounts'
                    : state.scope.account}
                </td>
                <td>{group.count}</td>
                <td>{demoMoney(group.outflowMinor)}</td>
                <td>
                  <span className="fw-status" data-tone="warn">
                    Unavailable
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fw-panels" style={{ marginTop: 13 }}>
        <article className="fw-panel">
          <div className="fw-panel-top">
            <h2 className="fw-panel-title">Coverage boundary</h2>
            <span className="fw-status" data-tone="warn">
              PARTIAL
            </span>
          </div>
          <p className="fw-sub">
            Available row excerpts do not prove a complete bank statement or
            beginning and ending balances.
          </p>
        </article>
        <article className="fw-panel">
          <div className="fw-panel-top">
            <h2 className="fw-panel-title">Next evidence</h2>
            <span className="fw-status">NOT REQUESTED</span>
          </div>
          <p className="fw-sub">
            A production request requires authorized Files custody and a
            retained reviewer identity.
          </p>
        </article>
      </div>
    </>
  );

  const accounts = (
    <>
      <p className="fw-page-note">
        Two demo account scopes · balances and live connection state are not
        supplied.
      </p>
      <div className="fw-table-wrap">
        <table className="fw-table">
          <thead>
            <tr>
              <th>Bank account</th>
              <th>Status</th>
              <th>Source</th>
              <th>Currency</th>
              <th>Observed records</th>
              <th className="fw-money-col">Observed outflow</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(['operating', 'reserve'] as const).map((account) => {
              const accountRows: TimelineRow[] = [
                ...(result?.status === 'ready' ? result.rows : []),
                ...ILLUSTRATIVE_HISTORY,
              ].filter((row) => row.account === account);
              const accountTotal = accountRows.reduce(
                (sum, row) => sum + BigInt(row.outflowMinor),
                0n,
              );
              const evidenceCount = accountRows.filter(
                (row) => !row.illustrativeHistory && row.sourceAvailable,
              ).length;
              return (
                <tr key={account}>
                  <td>
                    <strong>
                      {account === 'operating'
                        ? 'Operating account'
                        : 'Reserve account'}
                    </strong>
                  </td>
                  <td>
                    <span className="fw-status">Not connected</span>
                  </td>
                  <td>Demo + illustrative history</td>
                  <td>USD</td>
                  <td>
                    {accountRows.length} · {evidenceCount} excerpts
                  </td>
                  <td className="fw-money-col">
                    {demoMoney(accountTotal.toString())}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="fw-link"
                      onClick={() => {
                        setView('transactions');
                        changeScope({ account, period: 'comparison' });
                      }}
                    >
                      Transactions →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fw-page-note" style={{ marginTop: 17 }}>
        Observed outflow is not a balance. Account ownership and connection
        state remain unverified.
      </p>
    </>
  );

  return (
    <Workspace aria-label="Mhoo Finance application">
      <header className="fw-chrome">
        <span className="fw-logo">mhoo.</span>
        <span className="fw-divider" />
        <span className="fw-product">Finance</span>
        <span className="fw-demo">Demo data · design implementation</span>
      </header>
      <div className="fw-layout">
        <nav className="fw-nav" aria-label="Finance navigation">
          <div className="fw-nav-label">Bank</div>
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              className="fw-nav-button"
              key={item.id}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => switchView(item.id)}
            >
              <span className="fw-nav-glyph" aria-hidden="true">
                {item.glyph}
              </span>
              {item.label}
            </button>
          ))}
          <div className="fw-nav-meta">
            Jan–Feb 2025
            <br />
            Partial source coverage
          </div>
        </nav>
        <main className="fw-main">
          <div className="fw-top">
            <h1 className="fw-title">{pageTitle}</h1>
            {view === 'overview' || view === 'statements' ? (
              <div className="fw-controls">
                <select
                  className="fw-select"
                  aria-label="Account"
                  value={state.scope.account}
                  onChange={(event) =>
                    changeScope({
                      account: event.target.value as DemoScope['account'],
                      period:
                        view === 'overview' ? 'comparison' : state.scope.period,
                    })
                  }
                >
                  <option value="all">All accounts</option>
                  <option value="operating">Operating</option>
                  <option value="reserve">Reserve</option>
                </select>
                {view === 'statements' ? (
                  <select
                    className="fw-select"
                    aria-label="Period"
                    value={state.scope.period}
                    onChange={(event) =>
                      changeScope({
                        period: event.target.value as DemoScope['period'],
                      })
                    }
                  >
                    <option value="comparison">Jan–Feb 2025</option>
                    <option value="february">February 2025</option>
                    <option value="march">March 2025</option>
                  </select>
                ) : null}
              </div>
            ) : null}
          </div>
          {view === 'overview' && overview}
          {view === 'transactions' && transactions}
          {view === 'statements' && statements}
          {view === 'accounts' && accounts}
          <details className="fw-details">
            <summary>Demo controls and methodology</summary>
            <p>
              Invented USD outflow records only. No original files, statement
              controls, live providers, balances, income, profit, connection
              state, or persisted review are represented.
            </p>
            <div className="fw-actions" style={{ marginTop: 10 }}>
              <select
                className="fw-select"
                aria-label="Snapshot"
                value={state.scope.snapshot}
                onChange={(event) =>
                  changeScope({
                    snapshot: event.target.value as DemoScope['snapshot'],
                  })
                }
              >
                <option value="demo-v1">Partial excerpts</option>
                <option value="demo-v2">Supplied excerpts</option>
              </select>
              <select
                className="fw-select"
                aria-label="Demo response simulation"
                value={state.scenario}
                onChange={(event) =>
                  request(
                    state.scope,
                    state.question,
                    event.target.value as DemoScenario,
                  )
                }
              >
                <option value="normal">Normal</option>
                <option value="empty">Empty</option>
                <option value="missing">Missing excerpts</option>
                <option value="denied">Denied</option>
                <option value="failed">Failed</option>
                <option value="slow">Slow</option>
              </select>
              {onExit && (
                <Button
                  title="Back to workspace preparation"
                  onClick={onExit}
                />
              )}
            </div>
          </details>
          <footer className="fw-bottom">
            <span>
              Snapshot {state.scope.snapshot} · USD · No live connections
            </span>
            <span>{result?.limitation ?? 'Loading scoped fixture…'}</span>
          </footer>
        </main>
      </div>
      {drawerRow ? (
        <>
          <div className="fw-shade" onClick={closeDrawer} aria-hidden="true" />
          <aside
            className="fw-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction evidence"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeDrawer();
            }}
          >
            <div className="fw-drawer-top">
              <span>INVESTIGATION / {drawerRow.id.toUpperCase()}</span>
              <button
                ref={closeButton}
                type="button"
                className="fw-close"
                aria-label="Close investigation"
                onClick={closeDrawer}
              >
                ×
              </button>
            </div>
            <span
              className="fw-status"
              data-tone={
                trace?.raw && !drawerRow.illustrativeHistory ? 'ok' : 'warn'
              }
            >
              {drawerRow.illustrativeHistory
                ? 'ILLUSTRATIVE HISTORY'
                : selectedRowFlags.map((item) => item.label).join(' · ') ||
                  'SOURCE INSPECTION'}
            </span>
            <h2 className="fw-drawer-title">{drawerRow.description}</h2>
            <div className="fw-drawer-value">
              {demoMoney(drawerRow.outflowMinor)}
            </div>
            <div className="fw-sub">
              {drawerRow.date} · {drawerRow.account} · observed outflow
            </div>
            <div className="fw-reason">
              {drawerRow.illustrativeHistory
                ? 'Invented history for timeline interaction. This is not a source-backed transaction.'
                : trace?.raw
                  ? (selectedRowFlags[0]?.explanation ??
                    'A synthetic excerpt is available. It does not establish statement completeness or business classification.')
                  : 'The source locator exists, but its excerpt is missing. Classification stays unresolved.'}
            </div>
            <h3 className="fw-heading">Source trail</h3>
            <dl className="fw-definition" style={{ marginTop: 11 }}>
              <dt>Artifact</dt>
              <dd>{trace?.artifact ?? 'None'}</dd>
              <dt>Locator</dt>
              <dd>{trace?.locator ?? 'No source locator'}</dd>
              <dt>Snapshot</dt>
              <dd>{trace?.snapshot ?? state.scope.snapshot}</dd>
              <dt>Source state</dt>
              <dd>
                {drawerRow.illustrativeHistory
                  ? 'No source represented'
                  : trace?.raw
                    ? 'Synthetic excerpt available'
                    : 'Excerpt unavailable'}
              </dd>
            </dl>
            <pre className="fw-raw">
              {trace?.raw ?? 'No source excerpt supplied.'}
            </pre>
            {!drawerRow.illustrativeHistory ? (
              <div className="fw-drawer-actions">
                <button
                  type="button"
                  className="fw-button"
                  aria-pressed={reviewDecision === 'KEPT_UNCLASSIFIED'}
                  onClick={() => setReviewDecision('KEPT_UNCLASSIFIED')}
                >
                  Keep unclassified
                </button>
                {trace?.raw &&
                selectedRowFlags.some(
                  (item) => item.status === 'PARTIAL_MATCH',
                ) ? (
                  <button
                    type="button"
                    className="fw-button"
                    aria-pressed={reviewDecision === 'REJECTED_CANDIDATE'}
                    onClick={() => setReviewDecision('REJECTED_CANDIDATE')}
                  >
                    Reject candidate link
                  </button>
                ) : null}
                <button
                  type="button"
                  className="fw-button fw-primary"
                  aria-pressed={reviewDecision === 'EVIDENCE_REQUEST_DRAFTED'}
                  onClick={() => setReviewDecision('EVIDENCE_REQUEST_DRAFTED')}
                >
                  Draft evidence request
                </button>
              </div>
            ) : null}
            <p className="fw-local" role="status" aria-live="polite">
              {drawerRow.illustrativeHistory ? (
                <>
                  No evidence action is available for an illustrative history
                  row.
                </>
              ) : (
                <>
                  Local decision:{' '}
                  <strong>{reviewDecision.replaceAll('_', ' ')}</strong>
                  <br />
                  Preview only · nothing sent or written to Twenty.
                </>
              )}
            </p>
            <details className="fw-details">
              <summary>Basis and limitations</summary>
              <p>
                Outflow-positive fixture values, not profit or verified
                expenses. No statement controls, original files, live providers
                or persisted review are represented.
              </p>
            </details>
          </aside>
        </>
      ) : null}
    </Workspace>
  );
};
