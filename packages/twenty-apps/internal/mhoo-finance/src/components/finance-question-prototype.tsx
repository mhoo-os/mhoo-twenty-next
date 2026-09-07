import styled from '@emotion/styled';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Button } from 'twenty-ui/input';

import {
  DEMO_QUESTIONS,
  demoMoney,
  demoTrace,
  initialDemoState,
  reduceDemo,
  resolveDemoQuestion,
  selectedDemoTotal,
  visibleDemoRows,
  type DemoScenario,
  type DemoScope,
} from '../investigation/question-prototype';

const Shell = styled.section({
  fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
  color: '#252923',
  background: '#f6f7f3',
  padding: '28px',
  boxSizing: 'border-box',
  maxWidth: '1240px',
  width: '100%',
  margin: '0 auto',
  borderRadius: '16px',
  '& .mhoo-fq-header': {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  '& .mhoo-fq-eyebrow': {
    color: '#61705c',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.8px',
    textTransform: 'uppercase',
  },
  '& .mhoo-fq-title': {
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-1px',
    margin: '8px 0',
  },
  '& .mhoo-fq-muted': { color: '#687064', fontSize: '13px', lineHeight: 1.6 },
  '& .mhoo-fq-badge': {
    display: 'inline-block',
    border: '1px solid #cfdbc8',
    borderRadius: '30px',
    padding: '7px 11px',
    color: '#446339',
    background: '#edf4e9',
    fontSize: '11px',
    fontWeight: 600,
  },
  '& .mhoo-fq-notice': {
    padding: '12px 16px',
    border: '1px solid #e7dcb8',
    background: '#fff9e9',
    borderRadius: '10px',
    fontSize: '12px',
    lineHeight: 1.6,
    margin: '20px 0',
  },
  '& .mhoo-fq-grid': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
    gap: '18px',
    alignItems: 'start',
  },
  '& .mhoo-fq-card': {
    background: '#fff',
    border: '1px solid #e1e5dc',
    borderRadius: '14px',
    padding: '22px',
    minWidth: 0,
  },
  '& .mhoo-fq-heading': {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  '& .mhoo-fq-controls': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    margin: '18px 0',
  },
  '& .mhoo-fq-label': {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '11px',
    color: '#64705d',
    flex: '1 1 120px',
  },
  '& .mhoo-fq-input': {
    color: '#252923',
    border: '1px solid #d8ded2',
    borderRadius: '8px',
    padding: '10px',
    background: '#fff',
    fontSize: '13px',
    boxSizing: 'border-box',
    width: '100%',
  },
  '& .mhoo-fq-button': {
    cursor: 'pointer',
    border: '1px solid #d8ded2',
    borderRadius: '8px',
    padding: '9px 12px',
    background: '#fff',
    color: '#34482c',
    textAlign: 'left',
    font: 'inherit',
    fontSize: '12px',
  },
  '& .mhoo-fq-button:hover': { background: '#eff4eb', borderColor: '#8eac7e' },
  '& .mhoo-fq-button:focus-visible, & .mhoo-fq-input:focus-visible': {
    outline: '3px solid #9caf7e',
    outlineOffset: '3px',
  },
  '& .mhoo-fq-primary': {
    background: '#364c2b',
    color: '#fff',
    borderColor: '#364c2b',
    marginTop: '10px',
  },
  '& .mhoo-fq-primary:hover': { background: '#263c20', color: '#fff' },
  '& .mhoo-fq-suggestions': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    margin: '14px 0',
  },
  '& .mhoo-fq-answer': {
    borderLeft: '3px solid #789365',
    background: '#f4f7f0',
    padding: '15px',
    lineHeight: 1.7,
    fontSize: '14px',
    margin: '18px 0',
  },
  '& .mhoo-fq-stale': {
    color: '#807455',
    background: '#fff9e9',
    padding: '12px',
    fontSize: '12px',
    lineHeight: 1.6,
  },
  '& .mhoo-fq-bar': {
    display: 'block',
    width: '100%',
    padding: '14px',
    margin: '12px 0',
    border: '1px solid #e1e5dc',
    borderRadius: '10px',
    background: '#fff',
    color: '#252923',
    cursor: 'pointer',
    textAlign: 'left',
  },
  '& .mhoo-fq-bar[aria-pressed="true"]': {
    borderColor: '#647d53',
    background: '#f4f7f0',
  },
  '& .mhoo-fq-bar:focus-visible': {
    outline: '3px solid #9caf7e',
    outlineOffset: '3px',
  },
  '& .mhoo-fq-bar-label': {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '12px',
    gap: '12px',
  },
  '& .mhoo-fq-track': {
    display: 'block',
    height: '16px',
    borderRadius: '4px',
    background: '#eff1eb',
  },
  '& .mhoo-fq-fill': {
    display: 'block',
    height: '100%',
    borderRadius: '4px',
    background: '#809868',
  },
  '& .mhoo-fq-records': { marginTop: '18px' },
  '& .mhoo-fq-row': {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    border: 0,
    borderBottom: '1px solid #e8ece4',
    padding: '13px 4px',
    background: '#fff',
    color: '#252923',
    cursor: 'pointer',
    textAlign: 'left',
  },
  '& .mhoo-fq-row[aria-pressed="true"]': { background: '#edf4e9' },
  '& .mhoo-fq-row:focus-visible': { outline: '3px solid #9caf7e' },
  '& .mhoo-fq-code': {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    background: '#f4f5f1',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '12px',
    lineHeight: 1.8,
  },
  '& .mhoo-fq-footer': {
    borderTop: '1px solid #dfe5d8',
    marginTop: '22px',
    paddingTop: '15px',
    fontSize: '11px',
    color: '#687064',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  },
});

export const FinanceQuestionPrototype = ({
  onExit,
}: {
  onExit?: () => void;
}) => {
  const [state, dispatch] = useReducer(reduceDemo, initialDemoState);
  const [questionDraft, setQuestionDraft] = useState<string>(DEMO_QUESTIONS[0]);
  const sequence = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const request = (
    scope: DemoScope,
    question: string,
    scenario: DemoScenario,
  ) => {
    const id = ++sequence.current;
    dispatch({ type: 'request', id, scope, question, scenario });
    // Local simulated response only. Intentionally permit late delivery to exercise the guard.
    const timer = setTimeout(
      () => {
        dispatch({
          type: 'resolved',
          id,
          result: resolveDemoQuestion(scope, question, scenario),
        });
      },
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

  const chooseQuestion = (question: string) => {
    setQuestionDraft(question);
    request(state.scope, question, state.scenario);
  };
  const changeScope = (patch: Partial<DemoScope>) =>
    request({ ...state.scope, ...patch }, state.question, state.scenario);
  const rows = visibleDemoRows(state);
  const trace = demoTrace(state);
  const result = state.result;
  const coverage = state.question === DEMO_QUESTIONS[1];
  const maximum = Math.max(
    1,
    ...(result?.groups.map((group) =>
      coverage ? group.count : Number(group.outflowMinor),
    ) ?? []),
  );

  return (
    <Shell aria-label="Finance question prototype">
      <header className="mhoo-fq-header">
        <div>
          <div className="mhoo-fq-eyebrow">mhoo / finance lab</div>
          <h1 className="mhoo-fq-title">A question. A clear trail.</h1>
          <div className="mhoo-fq-muted">
            Explore the explanation, then follow the evidence.
          </div>
        </div>
        <span className="mhoo-fq-badge">SYNTHETIC DEMONSTRATION</span>
      </header>
      <div className="mhoo-fq-notice">
        <strong>Invented data · excluded from real totals.</strong> No account
        connection, live agent, Workspace query or original file. Every amount
        below is a demonstration.
      </div>
      <div className="mhoo-fq-controls">
        <label className="mhoo-fq-label">
          Account
          <select
            className="mhoo-fq-input"
            value={state.scope.account}
            onChange={(event) =>
              changeScope({
                account: event.target.value as DemoScope['account'],
              })
            }
          >
            <option value="all">All demo accounts</option>
            <option value="operating">Demo operating</option>
            <option value="reserve">Demo reserve</option>
          </select>
        </label>
        <label className="mhoo-fq-label">
          Period
          <select
            className="mhoo-fq-input"
            value={state.scope.period}
            onChange={(event) =>
              changeScope({ period: event.target.value as DemoScope['period'] })
            }
          >
            <option value="comparison">Jan–Feb 2025</option>
            <option value="february">February 2025</option>
            <option value="march">March 2025 (empty)</option>
          </select>
        </label>
        <label className="mhoo-fq-label">
          Snapshot
          <select
            className="mhoo-fq-input"
            value={state.scope.snapshot}
            onChange={(event) =>
              changeScope({
                snapshot: event.target.value as DemoScope['snapshot'],
              })
            }
          >
            <option value="demo-v1">Demo v1 · partial excerpts</option>
            <option value="demo-v2">Demo v2 · supplied excerpts</option>
          </select>
        </label>
      </div>
      <div className="mhoo-fq-grid">
        <section className="mhoo-fq-card" aria-label="Question and explanation">
          <div className="mhoo-fq-eyebrow">01 / ask & understand</div>
          <h2 className="mhoo-fq-heading">What deserves a closer look?</h2>
          <label className="mhoo-fq-label">
            Your question
            <input
              className="mhoo-fq-input"
              value={questionDraft}
              onChange={(event) => setQuestionDraft(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="mhoo-fq-button mhoo-fq-primary"
            onClick={() => request(state.scope, questionDraft, state.scenario)}
          >
            Explore question →
          </button>
          <div className="mhoo-fq-suggestions">
            {DEMO_QUESTIONS.map((question) => (
              <button
                type="button"
                className="mhoo-fq-button"
                key={question}
                onClick={() => chooseQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <div className="mhoo-fq-muted">
            Fixed supported questions and deterministic fixture responses. No
            live agent.
          </div>
          <div role="status" aria-live="polite">
            {state.loading ? (
              <>
                <p>Loading this demo scope…</p>
                {state.staleAnswer && (
                  <p className="mhoo-fq-stale">
                    <strong>Previous answer · stale</strong>
                    <br />
                    {state.staleAnswer}
                    <br />
                    Selections cleared while the new result loads.
                  </p>
                )}
              </>
            ) : (
              result && (
                <div className="mhoo-fq-answer">
                  <strong>{result.question}</strong>
                  <br />
                  {result.answer}
                </div>
              )
            )}
          </div>
          {!state.loading && result?.status === 'ready' && (
            <>
              <div className="mhoo-fq-eyebrow">Scope in view</div>
              <p className="mhoo-fq-muted">
                {state.scope.account} · {state.scope.snapshot} ·{' '}
                {state.selectedMonth ?? 'all selected periods'}
                <br />
                {rows.length} contributing demo records ·{' '}
                {demoMoney(selectedDemoTotal(state))} synthetic outflow. Filters
                apply to the records and evidence below.
              </p>
              <h3 className="mhoo-fq-heading">Why look closer?</h3>
              <p className="mhoo-fq-muted">
                {rows.some((row) => !row.sourceAvailable)
                  ? 'A selected record has no source excerpt. That limits verification; it does not establish wrongdoing.'
                  : 'These selected excerpts can be inspected, but statement controls and real-world completeness are still unproved.'}{' '}
                Timing, transfers and classification could affect
                interpretation. Inspect the records before drawing a conclusion.
              </p>
            </>
          )}
          {result && !state.loading && (
            <p className="mhoo-fq-muted">{result.limitation}</p>
          )}
          {!state.loading && result?.status === 'refused' && (
            <button
              type="button"
              className="mhoo-fq-button"
              onClick={() => chooseQuestion(DEMO_QUESTIONS[1])}
            >
              Inspect evidence coverage instead
            </button>
          )}
        </section>
        <section
          className="mhoo-fq-card"
          aria-label="Chart and contributing records"
        >
          <div className="mhoo-fq-eyebrow">02 / select a pattern</div>
          <h2 className="mhoo-fq-heading">
            {coverage
              ? 'Source excerpts by period'
              : 'Synthetic outflows by period'}
          </h2>
          {state.loading ? (
            <p className="mhoo-fq-muted">
              Chart and records cleared while this scope loads.
            </p>
          ) : result?.status !== 'ready' ? (
            <p className="mhoo-fq-muted">
              {result?.status === 'empty'
                ? 'No matching demo data. Empty does not mean zero real activity.'
                : 'No chart or transactions available for this response.'}
            </p>
          ) : (
            <>
              <p className="mhoo-fq-muted">
                {coverage
                  ? 'Available synthetic excerpts / contributing records. This is not statement coverage.'
                  : 'USD · outflow-positive · invented data only.'}{' '}
                Select a bar to inspect its records.
              </p>
              {result.groups.map((group) => (
                <button
                  type="button"
                  className="mhoo-fq-bar"
                  key={group.month}
                  aria-label={'Select ' + group.label}
                  aria-pressed={state.selectedMonth === group.month}
                  onClick={() =>
                    dispatch({ type: 'month', month: group.month })
                  }
                >
                  <span className="mhoo-fq-bar-label">
                    <strong>{group.label}</strong>
                    <span>
                      {coverage
                        ? String(group.available) +
                          ' / ' +
                          String(group.count) +
                          ' excerpts'
                        : demoMoney(group.outflowMinor)}
                    </span>
                  </span>
                  <span className="mhoo-fq-track">
                    <span
                      className="mhoo-fq-fill"
                      style={{
                        width:
                          String(
                            ((coverage
                              ? group.available
                              : Number(group.outflowMinor)) /
                              maximum) *
                              100,
                          ) + '%',
                      }}
                    />
                  </span>
                </button>
              ))}
              {state.selectedMonth && (
                <button
                  type="button"
                  className="mhoo-fq-button"
                  onClick={() => dispatch({ type: 'month', month: null })}
                >
                  Clear period selection
                </button>
              )}
              <div className="mhoo-fq-records">
                <div className="mhoo-fq-eyebrow">
                  03 / contributing transactions
                </div>
                <p className="mhoo-fq-muted">
                  {rows.length} records in this selection. Select one for its
                  source.
                </p>
                {rows.map((row) => (
                  <button
                    type="button"
                    className="mhoo-fq-row"
                    key={row.id}
                    aria-pressed={state.selectedRow === row.id}
                    onClick={() => dispatch({ type: 'row', id: row.id })}
                  >
                    <span>
                      <strong>{row.description}</strong>
                      <br />
                      <span className="mhoo-fq-muted">
                        {row.date} · {row.account} ·{' '}
                        {row.sourceAvailable
                          ? 'Excerpt available'
                          : 'Missing excerpt'}
                      </span>
                    </span>
                    <span>{demoMoney(row.outflowMinor)} →</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
      <section
        className="mhoo-fq-card mhoo-fq-records"
        aria-label="Selected source evidence"
      >
        <div className="mhoo-fq-eyebrow">04 / verify the source</div>
        {trace ? (
          <>
            <h2 className="mhoo-fq-heading">{trace.row.description}</h2>
            <p className="mhoo-fq-muted">
              {trace.row.id} → {trace.artifact} → {trace.locator}
              <br />
              Snapshot {trace.snapshot} · USD minor-unit text · excluded from
              real totals
            </p>
            {trace.raw ? (
              <>
                <div className="mhoo-fq-code">{trace.raw}</div>
                <p className="mhoo-fq-muted">
                  Synthetic source excerpt. Original file unavailable: this
                  prototype has no Files custody.
                </p>
              </>
            ) : (
              <div role="status" className="mhoo-fq-notice">
                Source excerpt unavailable. No original file or replacement
                evidence is supplied.
              </div>
            )}
            <button
              type="button"
              className="mhoo-fq-button"
              onClick={() => dispatch({ type: 'row', id: null })}
            >
              Back to contributing records
            </button>
          </>
        ) : (
          <p className="mhoo-fq-muted">
            Select a transaction to follow its source trail. No previous
            evidence is retained when scope changes.
          </p>
        )}
      </section>
      <footer className="mhoo-fq-footer">
        <label className="mhoo-fq-label">
          Demo response simulation
          <select
            className="mhoo-fq-input"
            value={state.scenario}
            onChange={(event) =>
              request(
                state.scope,
                state.question,
                event.target.value as DemoScenario,
              )
            }
          >
            <option value="normal">Normal fixture</option>
            <option value="empty">Empty response</option>
            <option value="missing">Missing excerpts</option>
            <option value="denied">Denied response (simulated)</option>
            <option value="failed">Failed response</option>
            <option value="slow">Slow response / stale selection</option>
          </select>
        </label>
        <button
          type="button"
          className="mhoo-fq-button"
          onClick={() => request(state.scope, state.question, state.scenario)}
        >
          Retry this scope
        </button>
        <button
          type="button"
          className="mhoo-fq-button"
          onClick={() => {
            setQuestionDraft(DEMO_QUESTIONS[0]);
            request(initialDemoState.scope, DEMO_QUESTIONS[0], 'normal');
          }}
        >
          Reset demo context
        </button>
        {onExit && (
          <Button title="Back to workspace preparation" onClick={onExit} />
        )}
        <span>
          All response states are simulated. Installed permissions are not
          proved here.
        </span>
      </footer>
    </Shell>
  );
};
