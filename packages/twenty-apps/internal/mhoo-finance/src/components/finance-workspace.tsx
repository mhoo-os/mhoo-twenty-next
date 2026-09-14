import styled from '@emotion/styled';
import type { RestApiClient } from 'twenty-client-sdk/rest';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { FinanceFollowUpActions } from './finance-follow-up-actions';
import { useEffect, useRef, useState } from 'react';

import { currency, formatMoney, minor } from '../contracts/money';
import {
  financeFollowUpNextAction,
  financeFollowUpStateLabel,
  hasExactSelectedRecipients,
  type FinanceFollowUpState,
} from '../investigation/finance-follow-up-contract';
import {
  handoffSource,
  type HandoffResult,
  type SourceEntry,
} from '../investigation/source-handoff';
import {
  readWorkspaceFinance,
  workspaceReadFailure,
  type WorkspaceFinanceData,
  type WorkspaceFinanceFact,
  type WorkspaceFinanceFollowUp,
} from '../investigation/workspace-finance-data';
import {
  appendWorkspaceEvidenceDecision,
  evidenceDecisionFailure,
  readWorkspaceEvidenceHistory,
  type WorkspaceEvidenceAction,
  type WorkspaceEvidenceDecision,
} from '../investigation/workspace-evidence-decisions';
import {
  approveWorkspaceFinanceDraft,
  financeFollowUpMutationFailure,
  updateWorkspaceFinanceFollowUpState,
} from '../investigation/workspace-finance-follow-ups';
import {
  isSparseCoverageGap,
  timelineDateAt,
  timelineDayOffset,
  timelineMonthSpan,
  validTimelineWindow,
} from '../investigation/timeline-domain';
import { SYNTHETIC_WORKSPACE_FINANCE_DATA } from '../investigation/synthetic-workspace-data';
import {
  netMovementMinor,
  workspaceAggregateCurrency,
} from '../investigation/workspace-aggregate';

export type FinanceView =
  | 'overview'
  | 'transactions'
  | 'statements'
  | 'accounts'
  | 'followups'
  | 'sources';

const PAGE_TITLES: Readonly<Record<FinanceView, string>> = {
  overview: 'Overview',
  transactions: 'Transactions',
  statements: 'Statements',
  accounts: 'Accounts',
  followups: 'Follow-ups',
  sources: 'Add a source',
};

// Financial link-decision writes remain disabled. Native Task follow-ups use
// their separate caller-scoped REST workflow and do not enable this route.
const WORKSPACE_REVIEW_MUTATIONS_ENABLED = false;

const ACCOUNT_LANE_COLORS = [
  '#19a99b',
  '#6273d6',
  '#c4754d',
  '#9172bd',
  '#5b9e67',
] as const;

type BrushKind = 'move' | 'start' | 'end';

const SOURCE_ROUTES: readonly {
  id: Exclude<SourceEntry, 'apps' | 'csv'>;
  title: string;
  type: string;
  description: string;
  boundary: string;
  action: string;
}[] = [
  {
    id: 'bank',
    title: 'Bank',
    type: 'BANK CONNECTION',
    description: 'Use a bank source app already available to this Workspace.',
    boundary: 'No bank connection is established by this screen.',
    action: 'Open Apps',
  },
  {
    id: 'pos',
    title: 'POS · Clover',
    type: 'POINT OF SALE',
    description: 'Manage Clover as a distinct POS source in Workspace Apps.',
    boundary: 'Clover installation and connection remain separate actions.',
    action: 'Open Apps',
  },
  {
    id: 'statement',
    title: 'Uploaded statements',
    type: 'DOCUMENT SOURCE',
    description:
      'Open governed Source artifacts for current, historical, or closed-account statements.',
    boundary: 'This review surface does not upload or import a file.',
    action: 'Open source artifacts',
  },
  {
    id: 'email',
    title: 'Email evidence',
    type: 'WORKSPACE GMAIL EVIDENCE',
    description:
      'Use an already authorized Workspace Gmail connection for supporting evidence.',
    boundary: 'Email evidence never creates a financial entry by itself.',
    action: 'Open Apps',
  },
];

const readableDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const Workspace = styled.section({
  '--fw-canvas': 'var(--t-background-primary)',
  '--fw-surface': 'var(--t-background-primary)',
  '--fw-nav': 'var(--t-background-secondary)',
  '--fw-text': 'var(--t-font-color-primary)',
  '--fw-muted': 'var(--t-font-color-secondary)',
  '--fw-line': 'var(--t-border-color-light)',
  '--fw-accent': 'var(--t-accent-primary)',
  '--fw-soft': 'var(--t-background-transparent-blue)',
  '--fw-warn': 'var(--t-color-orange9)',
  '--fw-warn-bg': 'var(--t-background-transparent-orange)',
  '--fw-success': 'var(--t-color-green9)',
  color: 'var(--fw-text)',
  background: 'var(--fw-canvas)',
  border: 0,
  borderRadius: 0,
  overflow: 'hidden',
  minHeight: '640px',
  width: '100%',
  position: 'relative',
  isolation: 'isolate',
  fontFamily: 'var(--t-font-family)',
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
  '& .fw-table-action': {
    border: 0,
    padding: 0,
    color: 'var(--fw-text)',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 650,
    textAlign: 'left',
  },
  '& .fw-table-action:hover': { color: 'var(--fw-accent)' },
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
    boxShadow: 'var(--t-box-shadow-light)',
  },
  '& .fw-nav-glyph': { width: '15px', textAlign: 'center', fontSize: '14px' },
  '& .fw-nav-meta': {
    margin: '28px 11px 0',
    color: 'var(--fw-muted)',
    fontSize: '9px',
    lineHeight: 1.55,
  },
  '& .fw-main': { minWidth: 0, padding: '8px 4px 16px' },
  '& .fw-top': {
    minHeight: '38px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '19px',
  },
  '& .fw-top-title': { minWidth: '170px', flex: '1 1 170px' },
  '& .fw-title': {
    margin: 0,
    color: 'var(--fw-text)',
    fontSize: '25px',
    fontWeight: 600,
    letterSpacing: '-.8px',
    lineHeight: 1.2,
  },
  '& .fw-controls': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '7px',
    maxWidth: '100%',
  },
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
    background: 'var(--fw-warn-bg)',
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
    border: '1px solid var(--fw-warn)',
    background: 'var(--fw-warn-bg)',
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
  '& .fw-statement-table': { minWidth: '960px', tableLayout: 'auto' },
  '& .fw-statement-table .fw-money-col': { width: 'auto' },
  '& .fw-statement-table .fw-control-value': {
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  '& .fw-table tbody tr[tabindex]': { cursor: 'pointer' },
  '& .fw-table tbody tr[tabindex]:hover td': {
    background: 'var(--fw-soft)',
  },
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
    whiteSpace: 'nowrap',
  },
  '& .fw-button:hover': { background: 'var(--fw-soft)' },
  '& .fw-button[aria-pressed="true"]': {
    color: 'var(--fw-accent)',
    borderColor: 'var(--fw-accent)',
  },
  '& .fw-primary': {
    color: 'var(--t-font-color-inverted)',
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
  '& .fw-date-fields': {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
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
  '& .fw-date-fields .fw-date-input': { width: '96px' },
  '& .fw-timeline-tools': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    margin: '12px 0 8px',
  },
  '& .fw-timeline-scroll': {
    width: '100%',
    overflowX: 'auto',
    padding: '2px 0 7px',
    scrollbarColor: 'var(--fw-line) transparent',
  },
  '& .fw-timeline-canvas': {
    minWidth: '100%',
  },
  '& .fw-year-labels': {
    position: 'relative',
    height: '18px',
    margin: '5px 13px 0',
    color: 'var(--fw-muted)',
    fontSize: '10px',
  },
  '& .fw-year-labels span': {
    position: 'absolute',
    transform: 'translateX(-50%)',
    fontVariantNumeric: 'tabular-nums',
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
    display: 'block',
    minWidth: 0,
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
    fontFamily: 'var(--t-font-family)',
    fontSize: '11px',
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
  '& .fw-line-chart-path[data-direction="in"]': {
    stroke: 'var(--fw-success)',
  },
  '& .fw-line-chart-dot': {
    fill: 'var(--fw-accent)',
    stroke: 'var(--fw-surface)',
    strokeWidth: 2,
  },
  '& .fw-line-chart-dot[data-direction="in"]': {
    fill: 'var(--fw-success)',
  },
  '& .fw-movement-hero': {
    margin: '2px 0 18px',
    padding: '20px 22px 16px',
    overflow: 'hidden',
    border: '1px solid color-mix(in srgb, var(--fw-line) 80%, transparent)',
    borderRadius: '14px',
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--fw-soft) 48%, var(--fw-surface)) 0%, var(--fw-surface) 48%, color-mix(in srgb, var(--fw-nav) 80%, var(--fw-surface)) 100%)',
    boxShadow: '0 16px 36px rgba(18, 37, 64, .10)',
  },
  '& .fw-movement-head': {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '18px',
    marginBottom: '14px',
  },
  '& .fw-movement-head .fw-heading': {
    marginBottom: '4px',
    fontSize: '16px',
    letterSpacing: '-.01em',
  },
  '& .fw-lane-chart': {
    display: 'block',
    width: '100%',
    height: 'auto',
    overflow: 'visible',
  },
  '& .fw-lane-viewport': { overflowX: 'auto', overscrollBehaviorInline: 'contain' },
  '& .fw-lane-chart text': {
    fill: 'var(--fw-muted)',
    fontFamily: 'var(--t-font-family)',
    fontSize: '13px',
  },
  '& .fw-lane-grid': {
    stroke: 'color-mix(in srgb, var(--fw-line) 80%, transparent)',
    strokeWidth: 1,
  },
  '& .fw-lane-band': {
    fill: 'color-mix(in srgb, var(--fw-soft) 45%, transparent)',
    stroke: 'color-mix(in srgb, var(--fw-line) 50%, transparent)',
  },
  '& .fw-lane-zero': {
    stroke: 'var(--fw-muted)',
    strokeWidth: 1,
    strokeDasharray: '3 4',
    opacity: .55,
  },
  '& .fw-lane-path': { fill: 'none', strokeWidth: 2.75 },
  '& .fw-lane-glow': { fill: 'none', strokeWidth: 10, opacity: .12 },
  '& .fw-lane-dot': { stroke: 'var(--fw-surface)', strokeWidth: 2 },
  '& .fw-lane-hit': { fill: 'transparent', cursor: 'pointer' },
  '& .fw-lane-legend': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px 14px',
    marginTop: '8px',
    color: 'var(--fw-muted)',
    fontSize: '9px',
  },
  '& .fw-lane-legend span': { display: 'inline-flex', alignItems: 'center', gap: '5px' },
  '& .fw-lane-swatch': { width: '8px', height: '8px', borderRadius: '50%' },
  '& .fw-overview-foot': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '15px',
    borderTop: '1px solid var(--fw-line)',
  },
  '& .fw-workflow-actions form': {
    display: 'grid',
    gap: '12px',
    maxWidth: '700px',
    marginBottom: '24px',
  },
  '& .fw-workflow-actions label': { display: 'grid', gap: '6px' },
  '& .fw-workflow-actions input, & .fw-workflow-actions textarea, & .fw-workflow-actions select':
    {
      boxSizing: 'border-box',
      maxWidth: '100%',
      padding: '10px',
      border: '1px solid var(--fw-line)',
      borderRadius: '6px',
      background: 'var(--fw-surface)',
      color: 'var(--fw-text)',
      font: 'inherit',
    },
  '& .fw-workflow-actions textarea': { minHeight: '110px' },
  '& .fw-followup-list': {
    display: 'grid',
    marginTop: '8px',
    borderTop: '1px solid var(--fw-line)',
  },
  '& .fw-followup-row': {
    minHeight: '78px',
    display: 'grid',
    gridTemplateColumns:
      'minmax(260px, 1.7fr) minmax(120px, .7fr) minmax(120px, .7fr) minmax(220px, 1fr)',
    alignItems: 'center',
    gap: '24px',
    padding: '18px 4px',
    border: 0,
    borderBottom: '1px solid var(--fw-line)',
    color: 'var(--fw-text)',
    background: 'var(--fw-surface)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background calc(var(--t-animation-duration-fast) * 1s) ease',
  },
  '& .fw-followup-row:hover': { background: 'var(--fw-soft)' },
  '& .fw-followup-question': {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: 600,
  },
  '& .fw-followup-meta': { color: 'var(--fw-muted)', fontSize: '10px' },
  '& .fw-followup-status': {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '4px 7px',
    borderRadius: '999px',
    color: 'var(--fw-text)',
    background: 'var(--fw-nav)',
    fontSize: '10px',
  },
  '& .fw-detail-back': { marginBottom: '18px' },
  '& .fw-detail-heading': {
    maxWidth: '900px',
    marginBottom: '22px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--fw-line)',
  },
  '& .fw-detail-heading h2': {
    maxWidth: '720px',
    margin: '8px 0 12px',
    fontSize: '24px',
    fontWeight: 600,
    letterSpacing: '-.6px',
  },
  '& .fw-detail-heading .fw-page-note': { margin: '8px 0 0' },
  '& .fw-detail-tabs': {
    display: 'flex',
    gap: '5px',
    overflowX: 'auto',
    marginBottom: '24px',
    borderBottom: '1px solid var(--fw-line)',
  },
  '& .fw-detail-tab': {
    minHeight: '42px',
    flex: '0 0 auto',
    padding: '8px 12px',
    border: 0,
    borderBottom: '2px solid transparent',
    color: 'var(--fw-muted)',
    background: 'transparent',
    cursor: 'pointer',
  },
  '& .fw-detail-tab[aria-selected="true"]': {
    color: 'var(--fw-text)',
    borderBottomColor: 'var(--fw-accent)',
  },
  '& .fw-detail-section': { maxWidth: '900px' },
  '& .fw-detail-section h3': {
    margin: '26px 0 8px',
    fontSize: '13px',
    fontWeight: 650,
  },
  '& .fw-detail-list': {
    display: 'grid',
    gap: '9px',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  '& .fw-detail-item': {
    padding: '12px 0',
    borderBottom: '1px solid var(--fw-line)',
  },
  '& .fw-detail-item strong': { display: 'block', marginBottom: '3px' },
  '& .fw-detail-actions': {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '24px',
  },
  '& .fw-email-preview': {
    marginTop: '15px',
    padding: '20px',
    border: '1px solid var(--fw-line)',
    borderRadius: '8px',
    background: 'var(--fw-surface)',
  },
  '& .fw-email-body': {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--fw-line)',
    whiteSpace: 'pre-wrap',
  },
  '& .fw-shade': {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    background: 'var(--t-background-transparent-strong)',
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
    boxShadow: 'var(--t-box-shadow-strong)',
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
      display: 'block',
    },
    '& .fw-followup-row': {
      gridTemplateColumns:
        'minmax(220px, 1.5fr) minmax(110px, .7fr) minmax(180px, 1fr)',
    },
    '& .fw-followup-owner': { display: 'none' },
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
    '& .fw-movement-hero': { padding: '16px 14px 13px', borderRadius: '10px' },
    '& .fw-movement-head': { display: 'block' },
    '& .fw-lane-chart': { height: 'auto' },
    '& .fw-lane-viewport .fw-lane-chart': { minWidth: '760px' },
    '& .fw-lane-chart text': { fontSize: '18px' },
    '& .fw-followup-row': {
      minHeight: 'auto',
      gridTemplateColumns: '1fr',
      gap: '8px',
      padding: '17px 2px',
    },
    '& .fw-followup-owner': { display: 'block' },
    '& .fw-email-preview': { padding: '15px' },
  },
  '@media (pointer: coarse)': {
    '& .fw-window-handle': { width: '44px', marginLeft: '-22px' },
    '& .fw-brush': { marginInline: '22px' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& *': { transition: 'none !important' },
  },
});

type WorkspaceLoadState =
  | { kind: 'loading' }
  | { kind: 'denied' | 'failed' }
  | { kind: 'ready'; data: WorkspaceFinanceData };

const validWorkspaceFacts = (data: WorkspaceFinanceData) =>
  data.facts
    .filter((fact) => fact.date && fact.amountMinor !== null)
    .slice()
    .sort((left, right) =>
      left.date === right.date
        ? left.id.localeCompare(right.id)
        : left.date.localeCompare(right.date),
    );

const workspaceFactMoney = (fact: WorkspaceFinanceFact) =>
  fact.amountMinor === null
    ? '—'
    : (() => {
        try {
          return formatMoney({
            currency: currency(fact.currency),
            minor: fact.amountMinor,
          });
        } catch {
          return `${fact.amountMinor} minor units · currency unavailable`;
        }
      })();

const parseStatementControls = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const readMinor = (key: string) =>
      typeof record[key] === 'string' && /^-?(0|[1-9]\d*)$/.test(record[key])
        ? record[key]
        : null;
    const controls = {
      opening: readMinor('openingBalanceMinor'),
      closing: readMinor('closingBalanceMinor'),
      moneyIn: readMinor('moneyInMinor'),
      moneyOut: readMinor('moneyOutMinor'),
    };
    return Object.values(controls).every((item) => item !== null)
      ? controls
      : null;
  } catch {
    return null;
  }
};

const WorkspaceFinanceScreen = ({
  initialView,
  dataOverride,
  onTogglePreview,
  services,
}: {
  initialView: Exclude<FinanceView, 'sources'>;
  dataOverride?: WorkspaceFinanceData;
  onTogglePreview?: () => void;
  services?: {
    read: () => Promise<WorkspaceFinanceData>;
    client: RestApiClient;
  };
}) => {
  const [loadState, setLoadState] = useState<WorkspaceLoadState>(
    dataOverride
      ? { kind: 'ready', data: dataOverride }
      : {
          kind: 'loading',
        },
  );
  const [refresh, setRefresh] = useState(0);
  const [view, setView] = useState<FinanceView>(initialView);
  const [accountId, setAccountId] = useState('all');
  const [range, setRange] = useState({ start: '', end: '' });
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [dateError, setDateError] = useState('');
  const [timelineZoom, setTimelineZoom] = useState<'month' | 'year' | 'all'>(
    'year',
  );
  const [search, setSearch] = useState('');
  const [selectedFact, setSelectedFact] = useState<WorkspaceFinanceFact | null>(
    null,
  );
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<WorkspaceFinanceFollowUp | null>(null);
  const [followUpDetailSection, setFollowUpDetailSection] = useState<
    'summary' | 'people' | 'evidence' | 'email'
  >('summary');
  const [followUpMutation, setFollowUpMutation] = useState<
    'idle' | 'saving' | 'denied' | 'failed'
  >('idle');
  const [evidenceHistory, setEvidenceHistory] = useState<
    | { kind: 'idle' | 'loading' | 'denied' | 'failed' }
    | { kind: 'ready'; rows: readonly WorkspaceEvidenceDecision[] }
  >({ kind: 'idle' });
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [sourceHandoff, setSourceHandoff] = useState<{
    route: SourceEntry;
    result: HandoffResult;
  } | null>(null);
  const liveDrag = useRef<{
    kind: BrushKind;
    x: number;
    width: number;
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (dataOverride) {
      setLoadState({ kind: 'ready', data: dataOverride });
      const dates = validWorkspaceFacts(dataOverride)
        .map((fact) => fact.date)
        .sort();
      const start = dates[0] ?? '';
      const end = dates.at(-1) ?? '';
      setRange({ start, end });
      setDraftStart(start);
      setDraftEnd(end);
      setDateError('');
      return () => {
        cancelled = true;
      };
    }
    setLoadState({ kind: 'loading' });
    (services?.read ?? readWorkspaceFinance)()
      .then((data) => {
        if (cancelled) return;
        setLoadState({ kind: 'ready', data });
        const dates = validWorkspaceFacts(data)
          .map((fact) => fact.date)
          .sort();
        setRange((current) => ({
          start: current.start || dates[0] || '',
          end: current.end || dates.at(-1) || '',
        }));
        setDraftStart((current) => current || dates[0] || '');
        setDraftEnd((current) => current || dates.at(-1) || '');
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadState({ kind: workspaceReadFailure(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [dataOverride, refresh, services]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedFact?.artifactId) {
      setEvidenceHistory({ kind: 'idle' });
      return () => {
        cancelled = true;
      };
    }
    setEvidenceHistory({ kind: 'loading' });
    readWorkspaceEvidenceHistory(selectedFact.id, selectedFact.artifactId)
      .then((rows) => {
        if (!cancelled) setEvidenceHistory({ kind: 'ready', rows });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setEvidenceHistory({ kind: evidenceDecisionFailure(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFact?.artifactId, selectedFact?.id]);

  if (loadState.kind !== 'ready') {
    return (
      <Workspace aria-label={`${PAGE_TITLES[initialView]} Finance content`}>
        <main className="fw-main">
          <h1 className="fw-title">{PAGE_TITLES[initialView]}</h1>
          <div className="fw-empty" role="status">
            {loadState.kind === 'loading'
              ? 'Reading authorized Workspace records…'
              : loadState.kind === 'denied'
                ? 'You do not have permission to read these Finance records.'
                : 'Finance records could not be read. No demo data was substituted.'}
          </div>
          {loadState.kind !== 'loading' ? (
            <button
              type="button"
              className="fw-button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Retry
            </button>
          ) : null}
        </main>
      </Workspace>
    );
  }

  const data = loadState.data;
  const isSynthetic = dataOverride !== undefined;
  const relatedFollowUps = selectedFact
    ? data.followUps.filter((followUp) =>
        followUp.subjects.some(
          (subject) =>
            subject.kind === 'TRANSACTION' &&
            subject.reference === selectedFact.id,
        ),
      )
    : [];
  const allFacts = validWorkspaceFacts(data);
  const invalidFactCount = data.facts.length - allFacts.length;
  const domainStart = allFacts.map((fact) => fact.date).sort()[0] ?? '';
  const domainEnd =
    allFacts
      .map((fact) => fact.date)
      .sort()
      .at(-1) ?? '';
  const domainLast = domainEnd
    ? Math.max(0, timelineDayOffset(domainStart, domainEnd))
    : 0;
  const liveDay = (date: string) => timelineDayOffset(domainStart, date);
  const liveDate = (day: number) => timelineDateAt(domainStart, day);
  const activeStart = range.start || domainStart;
  const activeEnd = range.end || domainEnd;
  const scopedFacts = allFacts.filter(
    (fact) =>
      (accountId === 'all' || fact.accountId === accountId) &&
      (!activeStart || fact.date >= activeStart) &&
      (!activeEnd || fact.date <= activeEnd),
  );
  const facts = scopedFacts.filter(
    (fact) =>
      view !== 'transactions' ||
      fact.description.toLowerCase().includes(search.toLowerCase()),
  );
  const eligibleFacts = scopedFacts.filter(
    (fact) => fact.includedInTotals && fact.status !== 'SUPERSEDED',
  );
  const aggregateCurrency = workspaceAggregateCurrency(
    eligibleFacts,
    data.truncated,
  );
  const aggregateAvailable = aggregateCurrency.kind === 'available';
  const noEligibleFacts = facts.length > 0 && !eligibleFacts.length;
  const aggregateUnavailableReason =
    aggregateCurrency.kind === 'available' || !facts.length
      ? null
      : noEligibleFacts
        ? 'No transactions are included in totals · review the inclusion state before cash movement can be calculated'
      : aggregateCurrency.kind === 'truncated'
        ? 'Result limit reached · totals and chart withheld'
        : aggregateCurrency.kind === 'mixed'
          ? 'Mixed currencies · totals and chart withheld'
          : aggregateCurrency.kind === 'currency-unavailable'
            ? 'Currency unavailable · totals and chart withheld'
            : 'Money exceeds the exact supported range · totals and chart withheld';
  const aggregateMoney = (value: string | bigint) =>
    aggregateCurrency.kind === 'available'
      ? formatMoney({
          currency: aggregateCurrency.currency,
          minor: minor(value.toString()).toString(),
        })
      : '—';
  const selectedAccountLabel =
    data.accounts.find((account) => account.id === accountId)?.label ?? null;
  const visibleStatements = data.statements.filter(
    (statement) =>
      (!activeStart || statement.period >= activeStart.slice(0, 7)) &&
      (!activeEnd || statement.period <= activeEnd.slice(0, 7)) &&
      (accountId === 'all' || statement.accountKey === selectedAccountLabel),
  );
  const moneyInMinor =
    aggregateCurrency.kind === 'available'
      ? aggregateCurrency.moneyInMinor
      : '0';
  const moneyOutMinor =
    aggregateCurrency.kind === 'available'
      ? aggregateCurrency.moneyOutMinor
      : '0';
  const chartFacts = aggregateAvailable
    ? [...eligibleFacts].sort((left, right) =>
        left.date.localeCompare(right.date),
      )
    : [];
  const chartAccountLanes = aggregateAvailable
    ? data.accounts
        .map((account) => {
          let cumulative = 0n;
          const points = chartFacts
            .filter((fact) => fact.accountId === account.id)
            .map((fact) => {
              const amount = BigInt(fact.amountMinor ?? '0');
              cumulative += fact.direction === 'in' ? amount : -amount;
              return { fact, cumulative };
            });
          return { account, points };
        })
        .filter((lane) => lane.points.length > 0)
        .slice(0, 5)
    : [];
  const laneX = scaleLinear({
    domain: [liveDay(activeStart), Math.max(liveDay(activeStart) + 1, liveDay(activeEnd))],
    range: [176, 944],
  });
  const laneStep = chartAccountLanes.length <= 2 ? 105 : 76;
  const laneHeight = 72 + chartAccountLanes.length * laneStep;
  const laneY = (laneIndex: number, value: bigint, magnitude: number) =>
    75 + laneIndex * laneStep - (Number(value) / magnitude) * 32;
  const laneSegments = <T extends { fact: WorkspaceFinanceFact }>(
    points: readonly T[],
  ) => {
    const segments: T[][] = [];
    for (const point of points) {
      const segment = segments.at(-1);
      const previous = segment?.at(-1);
      if (
        !segment ||
        (previous && isSparseCoverageGap(previous.fact.date, point.fact.date))
      ) {
        segments.push([point]);
      } else {
        segment.push(point);
      }
    }
    return segments;
  };
  const domainMonths =
    domainStart && domainEnd ? timelineMonthSpan(domainStart, domainEnd) : 1;
  const timelineWidth =
    timelineZoom === 'all'
      ? '100%'
      : `${Math.max(640, domainMonths * (timelineZoom === 'month' ? 96 : 28))}px`;
  const timelineYears =
    domainStart && domainEnd
      ? Array.from(
          {
            length:
              Number(domainEnd.slice(0, 4)) -
              Number(domainStart.slice(0, 4)) +
              1,
          },
          (_, index) => Number(domainStart.slice(0, 4)) + index,
        )
      : [];

  const changeLiveWindow = (
    kind: BrushKind,
    delta: number,
    initialStart = liveDay(activeStart),
    initialEnd = liveDay(activeEnd),
  ) => {
    if (!domainStart || !domainEnd) return;
    let start = initialStart;
    let end = initialEnd;
    if (kind === 'move') {
      const bounded = Math.max(-start, Math.min(domainLast - end, delta));
      start += bounded;
      end += bounded;
    } else if (kind === 'start') {
      start = Math.max(0, Math.min(end, start + delta));
    } else {
      end = Math.max(start, Math.min(domainLast, end + delta));
    }
    const nextStart = liveDate(start);
    const nextEnd = liveDate(end);
    setRange({ start: nextStart, end: nextEnd });
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setDateError('');
    setSelectedFact(null);
  };
  const startLiveDrag = (
    kind: BrushKind,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!activeStart || !activeEnd) return;
    event.preventDefault();
    // Remote DOM buttons do not expose setPointerCapture or layout methods.
    // Month/year have a known width; fit-all uses a 640px estimate when
    // Remote DOM cannot report the rendered container width.
    const canvasWidth = timelineWidth.endsWith('px')
      ? Number.parseInt(timelineWidth, 10)
      : 640;
    liveDrag.current = {
      kind,
      x: event.clientX,
      width: Math.max(1, Number.isFinite(canvasWidth) ? canvasWidth - 26 : 614),
      start: liveDay(activeStart),
      end: liveDay(activeEnd),
    };
  };
  const moveLiveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!liveDrag.current) return;
    const drag = liveDrag.current;
    changeLiveWindow(
      drag.kind,
      Math.round(((event.clientX - drag.x) / drag.width) * (domainLast + 1)),
      drag.start,
      drag.end,
    );
  };
  const liveKey = (
    kind: BrushKind,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = kind === 'move' || event.shiftKey ? 7 : 1;
    changeLiveWindow(kind, event.key === 'ArrowRight' ? step : -step);
  };
  const openSource = async (route: SourceEntry) => {
    setSourceHandoff(null);
    setSourceHandoff({ route, result: await handoffSource(route) });
  };
  const appendEvidenceAction = async (action: WorkspaceEvidenceAction) => {
    if (
      !WORKSPACE_REVIEW_MUTATIONS_ENABLED ||
      !selectedFact?.artifactId ||
      savingEvidence
    )
      return;
    setSavingEvidence(true);
    try {
      const history = await appendWorkspaceEvidenceDecision({
        entryReference: selectedFact.id,
        evidenceReference: selectedFact.artifactId,
        sourceTypes: 'FINANCE_FACT|SOURCE_ARTIFACT',
        action,
        reasonCode: 'EXISTING_FACT_ARTIFACT_RELATION',
        at: new Date().toISOString(),
      });
      setEvidenceHistory({ kind: 'ready', rows: history });
    } catch (error) {
      setEvidenceHistory({ kind: evidenceDecisionFailure(error) });
    } finally {
      setSavingEvidence(false);
    }
  };

  const reloadFollowUp = async (id: string) => {
    if (isSynthetic) return;
    const updated = await (services?.read ?? readWorkspaceFinance)();
    const task = updated.followUps.find((row) => row.id === id);
    if (!task)
      throw new Error(
        'Saved Task is not visible after reload. Check permissions before retrying.',
      );
    setLoadState({ kind: 'ready', data: updated });
    setSelectedFollowUp(task);
    setView('followups');
  };

  const transitionFollowUp = async (to: FinanceFollowUpState) => {
    if (!selectedFollowUp || isSynthetic || followUpMutation === 'saving')
      return;
    setFollowUpMutation('saving');
    try {
      await updateWorkspaceFinanceFollowUpState(
        {
          taskId: selectedFollowUp.id,
          from: selectedFollowUp.state,
          to,
          expectedUpdatedAt: selectedFollowUp.updatedAt,
          expectedRevision: selectedFollowUp.revision,
          at: new Date().toISOString(),
        },
        services?.client,
      );
      await reloadFollowUp(selectedFollowUp.id);
      setFollowUpMutation('idle');
    } catch (error) {
      setFollowUpMutation(financeFollowUpMutationFailure(error));
    }
  };

  const approveFollowUpDraft = async () => {
    if (
      !selectedFollowUp?.draftEmail ||
      isSynthetic ||
      followUpMutation === 'saving'
    )
      return;
    setFollowUpMutation('saving');
    try {
      await approveWorkspaceFinanceDraft(
        {
          taskId: selectedFollowUp.id,
          from: 'AWAITING_APPROVAL',
          financeState: selectedFollowUp.state,
          expectedUpdatedAt: selectedFollowUp.updatedAt,
          expectedRevision: selectedFollowUp.revision,
          draftEmail: selectedFollowUp.draftEmail,
          people: selectedFollowUp.people,
          at: new Date().toISOString(),
        },
        services?.client,
      );
      await reloadFollowUp(selectedFollowUp.id);
      setFollowUpMutation('idle');
    } catch (error) {
      setFollowUpMutation(financeFollowUpMutationFailure(error));
    }
  };

  const dateControls = domainStart ? (
    <>
      <div className="fw-window-tools">
        <div className="fw-date-fields">
          <label className="fw-date-field">
            From
            <input
              className="fw-date-input"
              type="text"
              aria-label="Window start"
              placeholder="YYYY-MM-DD"
              value={draftStart}
              onChange={(event) => {
                setDraftStart(event.target.value);
                setDateError('');
              }}
            />
          </label>
          <label className="fw-date-field">
            To
            <input
              className="fw-date-input"
              type="text"
              aria-label="Window end"
              placeholder="YYYY-MM-DD"
              value={draftEnd}
              onChange={(event) => {
                setDraftEnd(event.target.value);
                setDateError('');
              }}
            />
          </label>
          <button
            type="button"
            className="fw-button"
            onClick={() => {
              if (!validTimelineWindow(draftStart, draftEnd, domainStart, domainEnd)) {
                setDateError(`Use valid YYYY-MM-DD dates from ${domainStart} to ${domainEnd}, with From on or before To.`);
                return;
              }
              setRange({ start: draftStart, end: draftEnd });
              setSelectedFact(null);
              setDateError('');
            }}
          >
            Apply dates
          </button>
          <button
            type="button"
            className="fw-button"
            onClick={() => {
              setRange({ start: domainStart, end: domainEnd });
              setDraftStart(domainStart);
              setDraftEnd(domainEnd);
              setSelectedFact(null);
              setDateError('');
            }}
          >
            Reset dates
          </button>
        </div>
        {dateError ? <span role="alert" className="fw-label">{dateError}</span> : null}
        <span className="fw-label">
          Inclusive · {isSynthetic ? 'synthetic test' : 'authorized'} records
        </span>
      </div>
      <div className="fw-timeline-tools">
        <span className="fw-label">Visible timeline</span>
        <select
          className="fw-select"
          aria-label="Timeline zoom"
          value={timelineZoom}
          onChange={(event) =>
            setTimelineZoom(event.target.value as 'month' | 'year' | 'all')
          }
        >
          <option value="month">Month detail</option>
          <option value="year">Year overview</option>
          <option value="all">Fit all history</option>
        </select>
        <span className="fw-label">
          Scroll horizontally to continue across years
        </span>
      </div>
      <div className="fw-timeline-scroll">
        <div className="fw-timeline-canvas" style={{ width: timelineWidth }}>
          <div
            className="fw-brush"
            aria-label="Selected date window"
            onPointerMove={moveLiveDrag}
            onPointerUp={() => (liveDrag.current = null)}
            onPointerCancel={() => (liveDrag.current = null)}
            onPointerLeave={() => (liveDrag.current = null)}
          >
            <button
              type="button"
              className="fw-window-selection"
              aria-label="Move selected date window. Left or right arrow moves seven days."
              style={{
                left: `${(liveDay(activeStart) / Math.max(1, domainLast + 1)) * 100}%`,
                width: `${((liveDay(activeEnd) - liveDay(activeStart) + 1) / Math.max(1, domainLast + 1)) * 100}%`,
              }}
              onPointerDown={(event) => startLiveDrag('move', event)}
              onKeyDown={(event) => liveKey('move', event)}
            />
            {(['start', 'end'] as const).map((kind) => (
              <button
                type="button"
                className="fw-window-handle"
                key={kind}
                aria-label={`Resize window ${kind}. Arrow keys change one day, Shift changes seven days.`}
                style={{
                  left: `${((liveDay(kind === 'start' ? activeStart : activeEnd) + (kind === 'end' ? 1 : 0)) / Math.max(1, domainLast + 1)) * 100}%`,
                }}
                onPointerDown={(event) => startLiveDrag(kind, event)}
                onKeyDown={(event) => liveKey(kind, event)}
              >
                ‖
              </button>
            ))}
          </div>
          <div className="fw-year-labels" aria-hidden="true">
            {timelineYears.map((year) => (
              <span
                key={year}
                style={{
                  left: `${(Math.max(0, liveDay(`${year}-01-01`)) / Math.max(1, domainLast + 1)) * 100}%`,
                }}
              >
                {year}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="fw-month-labels" aria-hidden="true">
        <span>{readableDate(domainStart)}</span>
        <span>{readableDate(domainEnd)}</span>
      </div>
    </>
  ) : null;

  const factTable = (
    <div className="fw-table-wrap">
      <table className="fw-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Account</th>
            <th>Status</th>
            <th>Classification</th>
            <th className="fw-money-col">Money in</th>
            <th className="fw-money-col">Money out</th>
          </tr>
        </thead>
        <tbody>
          {facts.map((fact) => (
            <tr key={fact.id}>
              <td>{fact.date}</td>
              <td>
                <button
                  type="button"
                  className="fw-table-action"
                  onClick={() => setSelectedFact(fact)}
                >
                  {fact.description}
                </button>
              </td>
              <td>{fact.accountLabel}</td>
              <td>{fact.status}</td>
              <td>{fact.classification}</td>
              <td className="fw-money-col">
                {fact.direction === 'in' ? workspaceFactMoney(fact) : '—'}
              </td>
              <td className="fw-money-col">
                {fact.direction === 'out' ? workspaceFactMoney(fact) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Workspace aria-label={`${PAGE_TITLES[view]} Finance content`}>
      <main className="fw-main">
        <div className="fw-top">
          <div className="fw-top-title">
            <h1 className="fw-title">
              {selectedFollowUp ? 'Follow-up detail' : PAGE_TITLES[view]}
            </h1>
            <span className="fw-sub">
              {isSynthetic
                ? 'Synthetic test records · removable adapter'
                : 'Current Workspace records'}
            </span>
          </div>
          <div className="fw-controls">
            {onTogglePreview ? (
              <button
                type="button"
                className="fw-button"
                aria-pressed={isSynthetic}
                onClick={onTogglePreview}
              >
                {isSynthetic ? 'Return to Workspace records' : 'Preview sample data'}
              </button>
            ) : null}
            {selectedFollowUp ? (
              <button
                type="button"
                className="fw-button"
                onClick={() => {
                  setSelectedFollowUp(null);
                  setFollowUpDetailSection('summary');
                  setFollowUpMutation('idle');
                }}
              >
                ← Back to Follow-ups
              </button>
            ) : view === 'sources' ? (
              <button
                type="button"
                className="fw-button"
                onClick={() => setView(initialView)}
              >
                ← Back to {PAGE_TITLES[initialView]}
              </button>
            ) : view === 'followups' ? null : (
              <>
                <select
                  className="fw-select"
                  aria-label="Account"
                  value={accountId}
                  onChange={(event) => {
                    setAccountId(event.target.value);
                    setSelectedFact(null);
                  }}
                >
                  <option value="all">All accounts</option>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="fw-button"
                  onClick={() => setView('sources')}
                >
                  + Add source
                </button>
                {view === 'transactions' ? (
                  <button
                    type="button"
                    className="fw-button"
                    onClick={() => setView('followups')}
                  >
                    Follow-ups
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {view === 'overview' && !selectedFollowUp ? (
          <>
            {dateControls}
            <div className="fw-metrics" aria-label="Qualified cash movement">
              <div>
                <span className="fw-label">Money in</span>
                <div className="fw-value">{aggregateMoney(moneyInMinor)}</div>
              </div>
              <div>
                <span className="fw-label">Money out</span>
                <div className="fw-value">{aggregateMoney(moneyOutMinor)}</div>
              </div>
              <div>
                <span className="fw-label">Net movement</span>
                <div className="fw-value">
                  {aggregateMoney(
                    netMovementMinor(moneyInMinor, moneyOutMinor),
                  )}
                </div>
              </div>
            </div>
            <section className="fw-insights-layout">
              <div className="fw-movement-hero">
                <div className="fw-movement-head">
                  <div>
                    <h2 className="fw-heading">Cash movement by account</h2>
                    <p className="fw-sub">
                      {eligibleFacts.length} included · {facts.length} visible ·
                      excluded and superseded records remain outside this view
                    </p>
                  </div>
                </div>
                {aggregateAvailable ? (
                  <div className="fw-lane-viewport">
                  <svg
                    className="fw-lane-chart"
                    viewBox={`0 0 980 ${laneHeight}`}
                    role="img"
                    aria-label={`Qualified cumulative cash movement across ${chartAccountLanes.length} account lanes`}
                  >
                    {chartAccountLanes.map((lane, laneIndex) => {
                      const color = ACCOUNT_LANE_COLORS[laneIndex];
                      const baseline = 75 + laneIndex * laneStep;
                      const magnitude = Math.max(1, ...lane.points.map((point) => Number(point.cumulative < 0n ? -point.cumulative : point.cumulative)));
                      return (
                        <g key={lane.account.id}>
                          <rect className="fw-lane-band" x="164" y={baseline - 41} width="792" height="82" rx="10" />
                          <text x="0" y={baseline + 5}>
                            {lane.account.label}
                          </text>
                          <line
                            className="fw-lane-zero"
                            x1="176"
                            x2="944"
                            y1={baseline}
                            y2={baseline}
                          />
                          {laneSegments(lane.points).map((segment, index) => (
                            <g key={`${lane.account.id}-${index}`}>
                              <LinePath className="fw-lane-glow" data={segment} x={(point) => laneX(liveDay(point.fact.date)) ?? 176} y={(point) => laneY(laneIndex, point.cumulative, magnitude)} stroke={color} />
                              <LinePath className="fw-lane-path" data={segment} x={(point) => laneX(liveDay(point.fact.date)) ?? 176} y={(point) => laneY(laneIndex, point.cumulative, magnitude)} stroke={color} />
                            </g>
                          ))}
                          {lane.points.map((point) => (
                            <g key={point.fact.id}>
                              <circle
                                className="fw-lane-dot"
                                cx={laneX(liveDay(point.fact.date)) ?? 176}
                                cy={laneY(laneIndex, point.cumulative, magnitude)}
                                r="4"
                                fill={color}
                              >
                                <title>{`${point.fact.date} · ${lane.account.label} · ${workspaceFactMoney(point.fact)}`}</title>
                              </circle>
                              <circle
                                className="fw-lane-hit"
                                cx={laneX(liveDay(point.fact.date)) ?? 176}
                                cy={laneY(laneIndex, point.cumulative, magnitude)}
                                r="12"
                                role="button"
                                tabIndex={0}
                                aria-label={`Open ${point.fact.description}`}
                                onClick={() => setSelectedFact(point.fact)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setSelectedFact(point.fact);
                                  }
                                }}
                              />
                            </g>
                          ))}
                        </g>
                      );
                    })}
                    <text x="176" y={laneHeight - 18}>{readableDate(activeStart)}</text>
                    <text x="944" y={laneHeight - 18} textAnchor="end">{readableDate(activeEnd)}</text>
                  </svg>
                  </div>
                ) : (
                  <div className="fw-empty" role="status">
                    {aggregateUnavailableReason ??
                      'No cash movement to chart in this window.'}
                  </div>
                )}
                {aggregateAvailable ? (
                  <div className="fw-lane-legend">
                    {chartAccountLanes.map((lane, index) => (
                      <span key={lane.account.id}>
                        <i
                          className="fw-lane-swatch"
                          style={{ background: ACCOUNT_LANE_COLORS[index] }}
                        />
                        {lane.account.label}
                      </span>
                    ))}
                    <span>Each lane is independently scaled · gaps preserve sparse coverage</span>
                  </div>
                ) : null}
              </div>
            </section>
            {facts.length ? (
              factTable
            ) : (
              <div className="fw-empty">
                No matching Finance facts in this window.
              </div>
            )}
          </>
        ) : null}

        {view === 'transactions' && !selectedFollowUp ? (
          <>
            {dateControls}
            <div className="fw-actions">
              <input
                className="fw-date-input"
                aria-label="Search transactions"
                placeholder="Search transactions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="fw-label">
                {facts.length} {isSynthetic ? 'synthetic test' : 'authorized'}{' '}
                records
              </span>
            </div>
            {facts.length ? (
              factTable
            ) : (
              <div className="fw-empty">No matching Finance facts.</div>
            )}
          </>
        ) : null}

        {view === 'accounts' && !selectedFollowUp ? (
          <>
            {dateControls}
            <div className="fw-table-wrap">
              <table className="fw-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Observed records</th>
                    <th className="fw-money-col">Money in</th>
                    <th className="fw-money-col">Money out</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((account) => {
                    const accountFacts = allFacts.filter(
                      (fact) =>
                        fact.accountId === account.id &&
                        (!activeStart || fact.date >= activeStart) &&
                        (!activeEnd || fact.date <= activeEnd) &&
                        fact.includedInTotals &&
                        fact.status !== 'SUPERSEDED',
                    );
                    const accountAggregate = workspaceAggregateCurrency(
                      accountFacts,
                      data.truncated,
                    );
                    const accountMoney = (value: string) =>
                      accountAggregate.kind === 'available'
                        ? formatMoney({
                            currency: accountAggregate.currency,
                            minor: value,
                          })
                        : '—';
                    return (
                      <tr key={account.id}>
                        <td>
                          <strong>{account.label}</strong>
                        </td>
                        <td>{account.sourceKind}</td>
                        <td>{accountFacts.length}</td>
                        <td className="fw-money-col">
                          {accountMoney(
                            accountAggregate.kind === 'available'
                              ? accountAggregate.moneyInMinor
                              : '0',
                          )}
                        </td>
                        <td className="fw-money-col">
                          {accountMoney(
                            accountAggregate.kind === 'available'
                              ? accountAggregate.moneyOutMinor
                              : '0',
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!data.accounts.length ? (
                <div className="fw-empty">
                  No financial accounts are available in this Workspace.
                </div>
              ) : null}
              <p className="fw-local">
                Account totals show — when results are truncated, currency is
                unavailable, or an account contains mixed currencies.
              </p>
            </div>
          </>
        ) : null}

        {view === 'statements' && !selectedFollowUp ? (
          <>
            {dateControls}
            {visibleStatements.length ? (
              <p className="fw-local">
                Scroll the table sideways to see opening, closing, and status.
              </p>
            ) : null}
            <div className="fw-table-wrap">
              <table className="fw-table fw-statement-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Account</th>
                    <th>Source</th>
                    <th className="fw-money-col">Money in</th>
                    <th className="fw-money-col">Money out</th>
                    <th>Opening</th>
                    <th>Closing</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStatements.map((statement) => {
                    const controls = parseStatementControls(
                      statement.statementControls,
                    );
                    return (
                      <tr key={statement.id}>
                        <td>
                          <strong>{statement.period}</strong>
                        </td>
                        <td>{statement.accountKey}</td>
                        <td>{statement.sourceKind}</td>
                        <td className="fw-money-col">
                          <span className="fw-control-value">
                            {controls?.moneyIn
                              ? `${controls.moneyIn} minor units`
                              : 'Unavailable'}
                          </span>
                        </td>
                        <td className="fw-money-col">
                          <span className="fw-control-value">
                            {controls?.moneyOut
                              ? `${controls.moneyOut} minor units`
                              : 'Unavailable'}
                          </span>
                        </td>
                        <td>
                          <span className="fw-control-value">
                            {controls?.opening
                              ? `${controls.opening} minor units`
                              : 'Unavailable'}
                          </span>
                        </td>
                        <td>
                          <span className="fw-control-value">
                            {controls?.closing
                              ? `${controls.closing} minor units`
                              : 'Unavailable'}
                          </span>
                        </td>
                        <td>{statement.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!visibleStatements.length ? (
                <div className="fw-empty">
                  {data.statements.length
                    ? 'No statement source artifacts match this window and account.'
                    : 'No statement source artifacts are available in this Workspace.'}
                </div>
              ) : null}
              <p className="fw-local">
                Statement controls retain exact minor-unit text, but no money
                display is inferred until the source records an explicit
                currency.
              </p>
            </div>
          </>
        ) : null}

        {view === 'followups' && !selectedFollowUp ? (
          <>
            <p className="fw-page-note">
              Finance follow-ups are native Twenty Tasks with bounded Finance
              context. A reply or checked task is not proof of reconciliation.
            </p>
            <FinanceFollowUpActions
              section="create"
              data={data}
              disabled={isSynthetic}
              client={services?.client}
              onSaved={reloadFollowUp}
            />
            <div className="fw-followup-list" aria-label="Finance follow-ups">
              {data.followUps.map((followUp) => (
                <button
                  type="button"
                  className="fw-followup-row"
                  key={followUp.id}
                  onClick={() => {
                    setSelectedFollowUp(followUp);
                    setFollowUpDetailSection('summary');
                    setFollowUpMutation('idle');
                  }}
                >
                  <span>
                    <span className="fw-followup-question">
                      {followUp.title}
                    </span>
                    <span className="fw-followup-meta">
                      {followUp.subjects.length} linked subject
                      {followUp.subjects.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="fw-followup-status">
                    {financeFollowUpStateLabel(followUp.state)}
                  </span>
                  <span className="fw-followup-owner">
                    <span className="fw-followup-meta">Owner</span>
                    <br />
                    {followUp.ownerName}
                  </span>
                  <span>
                    <span className="fw-followup-meta">Next action</span>
                    <br />
                    {financeFollowUpNextAction(followUp.state)}
                  </span>
                </button>
              ))}
            </div>
            {!data.followUps.length ? (
              <div className="fw-empty">
                No Finance follow-up Tasks are visible to your role.
              </div>
            ) : null}
          </>
        ) : null}

        {view === 'followups' && selectedFollowUp ? (
          <>
            <section className="fw-detail-heading">
              <span className="fw-kicker">Native Twenty Task</span>
              <h2>{selectedFollowUp.title}</h2>
              <span className="fw-followup-status">
                {financeFollowUpStateLabel(selectedFollowUp.state)}
              </span>
              <p className="fw-page-note">
                Owner: {selectedFollowUp.ownerName} · Next:{' '}
                {financeFollowUpNextAction(selectedFollowUp.state)}
              </p>
              {selectedFollowUp.questionRoute !== 'UNCHANGED' ? (
                <div className="fw-reason" role="status">
                  Conclusion-seeking wording is withheld here. Finance keeps a
                  neutral evidence question; qualified professionals own audit,
                  tax, legal and misconduct conclusions.
                </div>
              ) : null}
              {selectedFollowUp.contractWarning ? (
                <div className="fw-reason" role="status">
                  Some Finance context failed validation and is withheld.
                </div>
              ) : null}
            </section>
            <div className="fw-detail-tabs" role="tablist">
              {(
                [
                  ['summary', 'Summary'],
                  ['people', 'People'],
                  ['evidence', 'Evidence'],
                  ['email', 'Email'],
                ] as const
              ).map(([section, label]) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={followUpDetailSection === section}
                  className="fw-detail-tab"
                  key={section}
                  onClick={() => setFollowUpDetailSection(section)}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="fw-button"
              disabled={isSynthetic || followUpMutation === 'saving'}
              onClick={() => {
                setFollowUpMutation('saving');
                void reloadFollowUp(selectedFollowUp.id)
                  .then(() => setFollowUpMutation('idle'))
                  .catch((error) =>
                    setFollowUpMutation(financeFollowUpMutationFailure(error)),
                  );
              }}
            >
              Reload Task
            </button>
            {followUpMutation === 'denied' || followUpMutation === 'failed' ? (
              <p role="alert" className="fw-warning">
                {followUpMutation === 'denied'
                  ? 'Twenty denied this action. Your permissions were not changed.'
                  : 'The write could not be verified. Reload the Task before retrying.'}
              </p>
            ) : null}
            {followUpDetailSection === 'summary' ? (
              <section className="fw-detail-section" aria-label="Summary">
                <h3>Question scope</h3>
                <ul className="fw-detail-list">
                  {selectedFollowUp.subjects.map((subject) => (
                    <li
                      className="fw-detail-item"
                      key={`${subject.kind}:${subject.reference}`}
                    >
                      <strong>{subject.label}</strong>
                      <span className="fw-local">
                        {subject.kind === 'TRANSACTION'
                          ? 'Transaction'
                          : 'Missing statement period'}{' '}
                        · {subject.reference}
                      </span>
                    </li>
                  ))}
                </ul>
                {!selectedFollowUp.subjects.length ? (
                  <div className="fw-empty">
                    No valid Finance subject links.
                  </div>
                ) : null}
                <h3>What we found</h3>
                <p>
                  {selectedFollowUp.findings ||
                    'No reviewer explanation has been recorded.'}
                </p>
                <p className="fw-local">
                  Explanations, authorized uploads and existing records retain
                  their own attribution. Native Task attachments are the file
                  surface; this Finance view does not upload automatically.
                </p>
                <div className="fw-detail-actions">
                  {selectedFollowUp.state === 'TO_DO' ? (
                    <>
                      <button
                        type="button"
                        className="fw-button"
                        disabled={isSynthetic || followUpMutation === 'saving'}
                        onClick={() =>
                          void transitionFollowUp('WAITING_FOR_REPLY')
                        }
                      >
                        Mark waiting for reply
                      </button>
                      <button
                        type="button"
                        className="fw-button"
                        disabled={isSynthetic || followUpMutation === 'saving'}
                        onClick={() =>
                          void transitionFollowUp('READY_FOR_REVIEW')
                        }
                      >
                        Ready for review
                      </button>
                    </>
                  ) : selectedFollowUp.state === 'WAITING_FOR_REPLY' ? (
                    <>
                      <button
                        type="button"
                        className="fw-button"
                        disabled={isSynthetic || followUpMutation === 'saving'}
                        onClick={() =>
                          void transitionFollowUp('READY_FOR_REVIEW')
                        }
                      >
                        Ready for review
                      </button>
                      <button
                        type="button"
                        className="fw-button"
                        disabled={isSynthetic || followUpMutation === 'saving'}
                        onClick={() => void transitionFollowUp('TO_DO')}
                      >
                        Return to do
                      </button>
                    </>
                  ) : selectedFollowUp.state === 'READY_FOR_REVIEW' ? (
                    <>
                      <button
                        type="button"
                        className="fw-button"
                        disabled={isSynthetic || followUpMutation === 'saving'}
                        onClick={() =>
                          void transitionFollowUp('WAITING_FOR_REPLY')
                        }
                      >
                        Request more information
                      </button>
                      <button
                        type="button"
                        className="fw-button"
                        disabled={isSynthetic || followUpMutation === 'saving'}
                        onClick={() => void transitionFollowUp('RESOLVED')}
                      >
                        Resolve after review
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="fw-button"
                      disabled={isSynthetic || followUpMutation === 'saving'}
                      onClick={() =>
                        void transitionFollowUp('READY_FOR_REVIEW')
                      }
                    >
                      Reopen review
                    </button>
                  )}
                </div>
                {isSynthetic ? (
                  <p className="fw-local" role="status">
                    This static sample is read-only.
                  </p>
                ) : followUpMutation === 'denied' ? (
                  <p className="fw-local" role="status">
                    Your Workspace role cannot update this Task.
                  </p>
                ) : followUpMutation === 'failed' ? (
                  <p className="fw-local" role="status">
                    The Task update could not be verified and was not shown as
                    complete.
                  </p>
                ) : null}
              </section>
            ) : null}

            {followUpDetailSection === 'people' ? (
              <section className="fw-detail-section" aria-label="People">
                <FinanceFollowUpActions
                  key={`${selectedFollowUp.id}:people:${selectedFollowUp.revision}`}
                  section="people"
                  task={selectedFollowUp}
                  data={data}
                  disabled={isSynthetic}
                  client={services?.client}
                  onSaved={reloadFollowUp}
                />
                <p className="fw-page-note">
                  People are shown only when requested. Being listed here does
                  not grant Workspace membership or Finance-record access.
                </p>
                <ul className="fw-detail-list">
                  {selectedFollowUp.people.map((person) => (
                    <li className="fw-detail-item" key={person.personId}>
                      <strong>{person.name}</strong>
                      <span>
                        {person.role} ·{' '}
                        {person.selectedRecipient
                          ? 'Selected recipient'
                          : 'Not selected for email'}
                      </span>
                    </li>
                  ))}
                </ul>
                {!selectedFollowUp.people.length ? (
                  <div className="fw-empty">No involved People recorded.</div>
                ) : null}
              </section>
            ) : null}

            {followUpDetailSection === 'evidence' ? (
              <section className="fw-detail-section" aria-label="Evidence">
                <FinanceFollowUpActions
                  key={`${selectedFollowUp.id}:evidence:${selectedFollowUp.revision}`}
                  section="evidence"
                  task={selectedFollowUp}
                  data={data}
                  disabled={isSynthetic}
                  client={services?.client}
                  onSaved={reloadFollowUp}
                />
                <p className="fw-page-note">
                  Replies and attachments stay attributed to their source.
                  Ambiguous correlation requires review and private replies are
                  not shared with other participants automatically.
                </p>
                <ul className="fw-detail-list">
                  {selectedFollowUp.evidence.map((item) => (
                    <li
                      className="fw-detail-item"
                      key={`${item.kind}:${item.reference}`}
                    >
                      <strong>{item.label}</strong>
                      <span>
                        {item.kind} · {item.attribution} ·{' '}
                        {item.reviewerAccepted
                          ? 'Reviewer accepted'
                          : 'Needs reviewer acceptance'}
                      </span>
                    </li>
                  ))}
                </ul>
                {!selectedFollowUp.evidence.length ? (
                  <div className="fw-empty">No valid evidence references.</div>
                ) : null}
              </section>
            ) : null}

            {followUpDetailSection === 'email' ? (
              <section className="fw-detail-section" aria-label="Email">
                <FinanceFollowUpActions
                  key={`${selectedFollowUp.id}:email:${selectedFollowUp.revision}`}
                  section="email"
                  task={selectedFollowUp}
                  data={data}
                  disabled={isSynthetic}
                  client={services?.client}
                  onSaved={reloadFollowUp}
                />
                <p className="fw-page-note">
                  A draft must show its intended sender, selected recipients,
                  exact body and attachments before approval. The sender label
                  is planned, not a verified mailbox. This build does not send
                  email or request new mailbox scopes.
                </p>
                {selectedFollowUp.draftEmail ? (
                  <div className="fw-email-preview">
                    <span className="fw-kicker">
                      {selectedFollowUp.emailApproval ?? 'Draft state unknown'}
                    </span>
                    <h3>From</h3>
                    <p>{selectedFollowUp.draftEmail.mailboxLabel}</p>
                    <h3>Recipients</h3>
                    <p>
                      {selectedFollowUp.people
                        .filter(
                          (person) =>
                            person.selectedRecipient &&
                            selectedFollowUp.draftEmail?.recipientPersonIds.includes(
                              person.personId,
                            ),
                        )
                        .map((person) => `${person.name} · ${person.role}`)
                        .join(', ') || 'No valid selected recipient'}
                    </p>
                    <h3>Subject</h3>
                    <p>{selectedFollowUp.draftEmail.subject}</p>
                    <div className="fw-email-body">
                      {selectedFollowUp.draftEmail.body}
                    </div>
                    <h3>Attachments</h3>
                    <p>
                      {selectedFollowUp.draftEmail.attachmentReferences.join(
                        ', ',
                      ) || 'None'}
                    </p>
                    {selectedFollowUp.emailApproval === 'AWAITING_APPROVAL' ? (
                      <div className="fw-detail-actions">
                        <button
                          type="button"
                          className="fw-button"
                          disabled={
                            selectedFollowUp.state === 'RESOLVED' ||
                            isSynthetic ||
                            followUpMutation === 'saving' ||
                            !hasExactSelectedRecipients(
                              selectedFollowUp.draftEmail,
                              selectedFollowUp.people,
                            )
                          }
                          onClick={() => void approveFollowUpDraft()}
                        >
                          Approve draft · do not send
                        </button>
                      </div>
                    ) : null}
                    {isSynthetic ? (
                      <p className="fw-local">
                        Synthetic adapter is read-only; approval is not faked.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="fw-empty">
                    No saved draft yet. Compose a request above, then review its
                    reloaded preview.
                  </div>
                )}
                <p className="fw-local">
                  Correlation:{' '}
                  {selectedFollowUp.correlationKey || 'Unavailable'}
                </p>
              </section>
            ) : null}
          </>
        ) : null}

        {view === 'sources' && !selectedFollowUp ? (
          <>
            <p className="fw-page-note">
              Choose a source type. These routes hand off to Twenty-owned
              Workspace surfaces; they do not claim a connection or import.
            </p>
            <div className="fw-source-grid">
              {SOURCE_ROUTES.map((route) => (
                <article className="fw-source-card" key={route.id}>
                  <span className="fw-kicker">{route.type}</span>
                  <h2>{route.title}</h2>
                  <p>{route.description}</p>
                  <button
                    type="button"
                    className="fw-button"
                    onClick={() => void openSource(route.id)}
                  >
                    {route.action}
                  </button>
                  <p className="fw-local">{route.boundary}</p>
                </article>
              ))}
            </div>
            {sourceHandoff ? (
              <div className="fw-empty" role="status">
                {sourceHandoff.result.ok
                  ? `${SOURCE_ROUTES.find((route) => route.id === sourceHandoff.route)?.title ?? 'Source'} handoff opened.`
                  : 'Twenty could not open that source surface. No connection was changed.'}
              </div>
            ) : null}
          </>
        ) : null}

        <footer className="fw-bottom">
          <span>
            {isSynthetic
              ? 'Synthetic adapter · explicit test data'
              : 'Current Workspace · permission-checked read'}
          </span>
          <span>
            {isSynthetic
              ? 'Removable preview source; never substituted into Workspace reads.'
              : data.truncated
                ? 'Result limit reached; totals are withheld from completeness claims.'
                : invalidFactCount
                  ? `${invalidFactCount} invalid or undated record${invalidFactCount === 1 ? '' : 's'} withheld; no synthetic fallback is active.`
                  : 'No synthetic fallback is active.'}
          </span>
        </footer>
      </main>

      {selectedFact ? (
        <>
          <div
            className="fw-shade"
            onClick={() => setSelectedFact(null)}
            aria-hidden="true"
          />
          <aside
            className="fw-drawer"
            role="dialog"
            aria-label="Transaction evidence"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setSelectedFact(null);
              }
            }}
          >
            <div className="fw-drawer-top">
              <span>
                {isSynthetic ? 'SYNTHETIC TEST RECORD' : 'WORKSPACE RECORD'}
              </span>
              <button
                type="button"
                className="fw-close"
                aria-label="Close investigation"
                onClick={() => setSelectedFact(null)}
              >
                ×
              </button>
            </div>
            <h2 className="fw-drawer-title">{selectedFact.description}</h2>
            <div className="fw-drawer-value">
              {workspaceFactMoney(selectedFact)}
            </div>
            <dl className="fw-definition">
              <dt>Direction</dt>
              <dd>{selectedFact.direction}</dd>
              <dt>Classification</dt>
              <dd>{selectedFact.classification}</dd>
              <dt>Source location</dt>
              <dd>{selectedFact.sourceLocation || 'Unavailable'}</dd>
              <dt>Artifact</dt>
              <dd>{selectedFact.artifactKey || 'No linked artifact'}</dd>
              <dt>Included in totals</dt>
              <dd>{selectedFact.includedInTotals ? 'Yes' : 'No'}</dd>
            </dl>
            <section className="fw-panel" style={{ marginTop: 14 }}>
              <div className="fw-panel-top">
                <h3 className="fw-panel-title">Follow-ups</h3>
                <span className="fw-status">{relatedFollowUps.length}</span>
              </div>
              {relatedFollowUps.length ? (
                <button
                  type="button"
                  className="fw-button"
                  onClick={() => {
                    setSelectedFact(null);
                    setView('followups');
                    setSelectedFollowUp(
                      relatedFollowUps.length === 1
                        ? (relatedFollowUps[0] ?? null)
                        : null,
                    );
                    setFollowUpDetailSection('summary');
                  }}
                >
                  {relatedFollowUps.length === 1
                    ? 'Open related follow-up'
                    : 'View related follow-ups'}
                </button>
              ) : (
                <p className="fw-local">
                  No native Finance follow-up Task references this transaction.
                </p>
              )}
            </section>
            {selectedFact.artifactId ? (
              <section className="fw-panel" style={{ marginTop: 14 }}>
                <div className="fw-panel-top">
                  <h3 className="fw-panel-title">Related evidence</h3>
                  <span className="fw-status">
                    {evidenceHistory.kind === 'ready'
                      ? (evidenceHistory.rows.at(-1)?.linkStatus ??
                        'LINKED BY RECORD')
                      : evidenceHistory.kind.toUpperCase()}
                  </span>
                </div>
                <p className="fw-sub">
                  The Finance fact carries an explicit Source artifact relation.
                  Reviewer actions append immutable Workspace decision records;
                  they do not delete either original or change classification.
                </p>
                {!WORKSPACE_REVIEW_MUTATIONS_ENABLED ? (
                  <p className="fw-warning" role="status">
                    Evidence link actions remain read-only in this install
                    candidate.
                  </p>
                ) : null}
                {evidenceHistory.kind === 'ready' ? (
                  <>
                    <div className="fw-actions">
                      {(evidenceHistory.rows.at(-1)?.linkStatus ?? 'LINKED') ===
                      'LINKED' ? (
                        <button
                          type="button"
                          className="fw-button"
                          disabled={
                            !WORKSPACE_REVIEW_MUTATIONS_ENABLED ||
                            savingEvidence
                          }
                          onClick={() => void appendEvidenceAction('UNLINKED')}
                        >
                          Unlink evidence
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="fw-button"
                          disabled={
                            !WORKSPACE_REVIEW_MUTATIONS_ENABLED ||
                            savingEvidence
                          }
                          onClick={() => void appendEvidenceAction('RESTORED')}
                        >
                          Restore link
                        </button>
                      )}
                    </div>
                    <ol className="fw-history">
                      {evidenceHistory.rows.map((event) => (
                        <li key={event.id}>
                          {event.createdAt} · {event.linkStatus} ·{' '}
                          {event.reasonCode}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : evidenceHistory.kind === 'denied' ? (
                  <p className="fw-local" role="status">
                    Your Workspace role cannot read or write evidence decisions.
                  </p>
                ) : evidenceHistory.kind === 'failed' ? (
                  <p className="fw-local" role="status">
                    Evidence decisions could not be read. No local fallback was
                    applied.
                  </p>
                ) : null}
              </section>
            ) : (
              <p className="fw-local">
                No explicit Source artifact relation exists, so no link action
                is offered.
              </p>
            )}
            <p className="fw-local">
              {isSynthetic
                ? 'This drawer shows sample fields only. It does not change Workspace records.'
                : 'This drawer reads retained Workspace fields. It does not infer direction from description text or change classification.'}
            </p>
          </aside>
        </>
      ) : null}
    </Workspace>
  );
};

export const FinanceWorkspace = ({
  initialView = 'overview',
  dataSource = 'workspace',
  services,
}: {
  onExit?: () => void;
  initialView?: Exclude<FinanceView, 'sources'>;
  dataSource?: 'workspace' | 'synthetic';
  services?: {
    read: () => Promise<WorkspaceFinanceData>;
    client: RestApiClient;
  };
}) => {
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const isSynthetic = dataSource === 'synthetic' || previewEnabled;
  const onTogglePreview =
    dataSource === 'workspace'
      ? () => setPreviewEnabled((enabled) => !enabled)
      : undefined;

  return isSynthetic ? (
    <WorkspaceFinanceScreen
      key="synthetic"
      dataOverride={SYNTHETIC_WORKSPACE_FINANCE_DATA}
      initialView={initialView}
      onTogglePreview={onTogglePreview}
    />
  ) : (
    <WorkspaceFinanceScreen
      key="workspace"
      initialView={initialView}
      onTogglePreview={onTogglePreview}
      services={services}
    />
  );
};
