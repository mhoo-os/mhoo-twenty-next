import { minor, sumMoney } from '../contracts/money';

export const DEMO_QUESTIONS = [
  'What changed in outflows?',
  'Which periods need more evidence?',
  'What was actual six-year profit?',
  'Is this fraud?',
] as const;
export type DemoQuestion = (typeof DEMO_QUESTIONS)[number];
export type DemoScenario =
  'normal' | 'empty' | 'missing' | 'denied' | 'failed' | 'slow';
export type DemoScope = {
  account: 'all' | 'operating' | 'reserve';
  period: 'comparison' | 'february' | 'march';
  snapshot: 'demo-v1' | 'demo-v2';
};
export type DemoRow = {
  id: string;
  account: 'operating' | 'reserve';
  date: string;
  description: string;
  outflowMinor: string;
  sourceLine: number;
  sourceAvailable: boolean;
  includedInRealTotals: false;
};

// Fixed invented data only. No client records, provider identifiers or Files.
const ROWS: readonly DemoRow[] = [
  ['d1', 'operating', '2025-01-08', 'Demo produce supplier', '42000', 2, true],
  ['d2', 'operating', '2025-01-17', 'Demo equipment service', '18000', 3, true],
  ['d3', 'reserve', '2025-01-21', 'Demo maintenance', '15000', 4, true],
  ['d4', 'operating', '2025-02-05', 'Demo produce supplier', '56000', 5, true],
  ['d5', 'operating', '2025-02-12', 'Demo equipment service', '28000', 6, true],
  [
    'd6',
    'operating',
    '2025-02-19',
    'Demo unclassified movement',
    '36000',
    7,
    false,
  ],
  ['d7', 'reserve', '2025-02-22', 'Demo maintenance', '20000', 8, true],
].map(
  ([
    id,
    account,
    date,
    description,
    outflowMinor,
    sourceLine,
    sourceAvailable,
  ]) => ({
    id,
    account,
    date,
    description,
    outflowMinor,
    sourceLine,
    sourceAvailable,
    includedInRealTotals: false,
  }),
) as DemoRow[];

export const initialDemoScope: DemoScope = {
  account: 'all',
  period: 'comparison',
  snapshot: 'demo-v1',
};
export const demoMoney = (value: string): string => {
  const amount = minor(value);
  const absolute = amount < 0n ? -amount : amount;
  return (
    (amount < 0n ? '-$' : '$') +
    String(absolute / 100n) +
    '.' +
    String(absolute % 100n).padStart(2, '0')
  );
};
export const demoScopeKey = (
  scope: DemoScope,
  question: string,
  scenario: DemoScenario,
) =>
  JSON.stringify([
    scope.account,
    scope.period,
    scope.snapshot,
    question,
    scenario,
  ]);

export type DemoResult = {
  key: string;
  scope: DemoScope;
  question: string;
  status: 'ready' | 'empty' | 'denied' | 'failed' | 'refused';
  answer: string;
  limitation: string;
  rows: DemoRow[];
  groups: {
    month: string;
    label: string;
    outflowMinor: string;
    available: number;
    count: number;
  }[];
  scenario: DemoScenario;
};

const total = (rows: readonly DemoRow[]) =>
  sumMoney(
    rows.map((row) => ({ currency: 'USD', minor: row.outflowMinor })),
    'USD',
  ).minor;

export function resolveDemoQuestion(
  scope: DemoScope,
  question: string,
  scenario: DemoScenario,
): DemoResult {
  const result: DemoResult = {
    key: demoScopeKey(scope, question, scenario),
    scope: { ...scope },
    question,
    scenario,
    status: 'ready',
    answer: '',
    rows: [],
    groups: [],
    limitation:
      'Invented USD examples only; excluded from all real totals. Source excerpts are synthetic, not original files. No statement balance controls or real account coverage are established.',
  };
  if (scenario === 'denied' || scenario === 'failed') {
    return {
      ...result,
      status: scenario,
      answer:
        scenario === 'denied'
          ? 'Demo access denied. No results or evidence were returned.'
          : 'Demo request failed. No fallback records were substituted.',
    };
  }
  if (question !== DEMO_QUESTIONS[0] && question !== DEMO_QUESTIONS[1]) {
    return {
      ...result,
      status: 'refused',
      answer:
        question === DEMO_QUESTIONS[3]
          ? 'An unexplained movement is not proof of fraud. Inspect supporting and contrary evidence, then request human review.'
          : question === DEMO_QUESTIONS[2]
            ? 'Actual six-year profit cannot be established from invented samples or partial exports. Complete coverage, eligibility and statement controls are missing.'
            : 'This demo supports outflow comparison and evidence coverage only. It does not run a live agent or publish findings. Choose a supported question.',
    };
  }
  const months =
    scope.period === 'comparison'
      ? ['2025-01', '2025-02']
      : [scope.period === 'february' ? '2025-02' : '2025-03'];
  const rows =
    scenario === 'empty'
      ? []
      : ROWS.filter(
          (row) =>
            (scope.account === 'all' || row.account === scope.account) &&
            months.includes(row.date.slice(0, 7)),
        ).map((row) => ({
          ...row,
          sourceAvailable:
            scenario !== 'missing' &&
            (row.sourceAvailable || scope.snapshot === 'demo-v2'),
        }));
  if (!rows.length)
    return {
      ...result,
      status: 'empty',
      answer:
        'No synthetic records match this scope. This is an empty demo result, not evidence of zero real activity.',
    };
  const groups = months.map((month) => {
    const selected = rows.filter((row) => row.date.startsWith(month));
    return {
      month,
      label: month === '2025-01' ? 'January' : 'February',
      outflowMinor: total(selected),
      available: selected.filter((row) => row.sourceAvailable).length,
      count: selected.length,
    };
  });
  const missing = rows.filter((row) => !row.sourceAvailable).length;
  const answer =
    question === DEMO_QUESTIONS[1]
      ? String(missing) +
        ' of ' +
        String(rows.length) +
        ' demo records lack source excerpts. Select a period to inspect its evidence gaps; even available excerpts do not establish statement reconciliation.'
      : groups.length === 2
        ? 'Synthetic outflows moved from ' +
          demoMoney(groups[0].outflowMinor) +
          ' in January to ' +
          demoMoney(groups[1].outflowMinor) +
          ' in February (' +
          demoMoney(
            (
              minor(groups[1].outflowMinor) - minor(groups[0].outflowMinor)
            ).toString(),
          ) +
          ' change). This is an observation, not a profit or causal conclusion.'
        : 'Synthetic outflows in this selected period are ' +
          demoMoney(total(rows)) +
          '. Only one period is selected; no period-to-period change is claimed.';
  return { ...result, answer, rows, groups };
}

export type DemoState = {
  requestId: number;
  scope: DemoScope;
  question: string;
  scenario: DemoScenario;
  loading: boolean;
  staleAnswer: string | null;
  result: DemoResult | null;
  selectedMonth: string | null;
  selectedRow: string | null;
};
export const initialDemoState: DemoState = {
  requestId: 0,
  scope: initialDemoScope,
  question: DEMO_QUESTIONS[0],
  scenario: 'normal',
  loading: false,
  staleAnswer: null,
  result: null,
  selectedMonth: null,
  selectedRow: null,
};
export type DemoAction =
  | {
      type: 'request';
      id: number;
      scope: DemoScope;
      question: string;
      scenario: DemoScenario;
    }
  | { type: 'resolved'; id: number; result: DemoResult }
  | { type: 'month'; month: string | null }
  | { type: 'row'; id: string | null };

export const visibleDemoRows = (state: DemoState): DemoRow[] =>
  state.loading || state.result?.status !== 'ready'
    ? []
    : state.result.rows.filter(
        (row) =>
          !state.selectedMonth || row.date.startsWith(state.selectedMonth),
      );

export function reduceDemo(state: DemoState, action: DemoAction): DemoState {
  if (action.type === 'request') {
    if (action.id <= state.requestId) return state;
    return {
      ...initialDemoState,
      requestId: action.id,
      scope: { ...action.scope },
      question: action.question,
      scenario: action.scenario,
      loading: true,
      staleAnswer: state.result?.answer ?? state.staleAnswer,
    };
  }
  if (action.type === 'resolved') {
    if (
      action.id !== state.requestId ||
      action.result.key !==
        demoScopeKey(state.scope, state.question, state.scenario)
    )
      return state;
    return {
      ...state,
      loading: false,
      staleAnswer: null,
      result: action.result,
    };
  }
  if (state.loading || state.result?.status !== 'ready') return state;
  if (action.type === 'month') {
    if (
      action.month !== null &&
      !state.result.groups.some((group) => group.month === action.month)
    )
      return state;
    return { ...state, selectedMonth: action.month, selectedRow: null };
  }
  if (
    action.id !== null &&
    !visibleDemoRows(state).some((row) => row.id === action.id)
  )
    return state;
  return { ...state, selectedRow: action.id };
}

export function demoTrace(state: DemoState) {
  const row = visibleDemoRows(state).find(
    (candidate) => candidate.id === state.selectedRow,
  );
  if (!row) return null;
  return {
    row,
    snapshot: state.scope.snapshot,
    artifact: state.scope.snapshot + '-invented-transactions.csv',
    locator: 'CSV row ' + String(row.sourceLine),
    raw: row.sourceAvailable
      ? [
          row.id,
          row.account,
          row.date,
          row.description,
          row.outflowMinor,
          'USD',
          'SYNTHETIC_EXCLUDED',
        ].join(',')
      : null,
  };
}

export const selectedDemoTotal = (state: DemoState) =>
  total(visibleDemoRows(state));
