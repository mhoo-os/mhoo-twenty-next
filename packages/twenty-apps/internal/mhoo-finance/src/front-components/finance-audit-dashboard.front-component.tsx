import 'twenty-ui/style.css';

import styled from '@emotion/styled';
import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { Status, Tag, type TagColor } from 'twenty-ui/data-display';
import { Callout, Loader } from 'twenty-ui/feedback';
import { Button, ButtonGroup } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H1Title, H2Title, Label } from 'twenty-ui/typography';

import {
  FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  type CoveragePeriod,
  type DashboardModel,
  type ReconciliationException,
  FIXTURE_DASHBOARD,
} from 'src/fixtures/fixture-pack';

type PreviewState =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'partial'
  | 'stale'
  | 'failed'
  | 'denied';

const PREVIEW_STATES: Array<{ value: PreviewState; label: string }> = [
  { value: 'populated', label: 'Populated' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'partial', label: 'Partial' },
  { value: 'stale', label: 'Stale' },
  { value: 'failed', label: 'Failed' },
  { value: 'denied', label: 'Denied' },
];

const StyledDashboard = styled.main`
  box-sizing: border-box;
  color: ${() => themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  font-family: ${() => themeCssVariables.font.family};
  gap: ${() => themeCssVariables.spacing[6]};
  margin: 0 auto;
  max-width: 1120px;
  padding: ${() => themeCssVariables.spacing[6]};
  width: 100%;
`;

const StyledHeader = styled.header`
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
`;

const StyledControls = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[3]};
`;

const StyledMetricGrid = styled.div`
  display: grid;
  gap: ${() => themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;

const StyledMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
`;

const StyledMetricValue = styled.strong`
  color: ${() => themeCssVariables.font.color.primary};
  font-size: ${() => themeCssVariables.font.size.xl};
`;

const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledRowDetail = styled.div`
  color: ${() => themeCssVariables.font.color.secondary};
  flex: 1 1 260px;
`;

const StyledExceptionDetails = styled.div`
  color: ${() => themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${() => themeCssVariables.font.size.sm};
  gap: ${() => themeCssVariables.spacing[1]};
`;

const StyledTrace = styled.ol`
  color: ${() => themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[2]};
  margin: 0;
  padding-left: ${() => themeCssVariables.spacing[5]};
`;

const StyledState = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 220px;
`;

const formatUsd = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

const coverageStatusColor = (status: CoveragePeriod['status']): TagColor => {
  switch (status) {
    case 'COMPLETE':
      return 'green';
    case 'PARTIAL':
    case 'STALE':
      return 'orange';
    case 'NO_DATA':
      return 'red';
    case 'NO_ACTIVITY':
      return 'gray';
  }
};

const exceptionStatusColor = (
  exception: ReconciliationException,
): TagColor => {
  if (exception.status === 'RESOLVED') {
    return 'green';
  }

  return exception.severity === 'HIGH' ? 'red' : 'orange';
};

const DashboardMetrics = ({ data }: { data: DashboardModel }) => (
  <StyledMetricGrid>
    <Card rounded fullWidth>
      <CardContent>
        <StyledMetric>
          <Label>Coverage</Label>
          <StyledMetricValue>{data.headline.completeCoverageCount}</StyledMetricValue>
          <Label>
            {data.headline.noDataCoverageCount} no data ·{' '}
            {data.headline.noActivityCoverageCount} no activity
          </Label>
        </StyledMetric>
      </CardContent>
    </Card>
    <Card rounded fullWidth>
      <CardContent>
        <StyledMetric>
          <Label>Normalized facts</Label>
          <StyledMetricValue>{data.headline.factCount}</StyledMetricValue>
          <Label>Latest revision per source row</Label>
        </StyledMetric>
      </CardContent>
    </Card>
    <Card rounded fullWidth>
      <CardContent>
        <StyledMetric>
          <Label>Open exposure</Label>
          <StyledMetricValue>{formatUsd(data.headline.exposureCents)}</StyledMetricValue>
          <Label>{data.headline.openExceptionCount} deterministic exceptions</Label>
        </StyledMetric>
      </CardContent>
    </Card>
    <Card rounded fullWidth>
      <CardContent>
        <StyledMetric>
          <Label>Custody controls</Label>
          <StyledMetricValue>{data.headline.revisionCount}</StyledMetricValue>
          <Label>{data.headline.duplicateSuppressedCount} duplicate or retry rows suppressed</Label>
        </StyledMetric>
      </CardContent>
    </Card>
  </StyledMetricGrid>
);

const Coverage = ({ data }: { data: DashboardModel }) => (
  <Section>
    <H2Title
      title="What is covered?"
      description="Coverage is source- and period-scoped. No activity is not the same as no data, and stale input stays visible."
    />
    <StyledRows>
      {data.coverage
        .filter(
          (item) =>
            item.artifactIds.length > 0 ||
            item.period === '2026-04' ||
            item.period === '2026-05',
        )
        .slice(0, 14)
        .map((item) => (
          <Card key={item.coverageKey} rounded fullWidth>
            <CardContent>
              <StyledRow>
                <Status text={`${item.period} · ${item.sourceKind}`} color="blue" />
                <Tag
                  color={coverageStatusColor(item.status)}
                  text={item.status.replace('_', ' ')}
                  variant="solid"
                />
                <StyledRowDetail>
                  {item.observedRows} rows · {item.freshness} · {item.lineage}
                </StyledRowDetail>
              </StyledRow>
            </CardContent>
          </Card>
        ))}
    </StyledRows>
  </Section>
);

const Exceptions = ({
  data,
  onTrace,
}: {
  data: DashboardModel;
  onTrace: () => void;
}) => (
  <Section>
    <H2Title
      title="What changed or looks wrong?"
      description="Every item includes a deterministic reason, supporting and limiting evidence, and a bounded next action."
    />
    <StyledRows>
      {data.exceptions.map((exception) => (
        <Card key={exception.exceptionKey} rounded fullWidth>
          <CardContent>
            <StyledRows>
              <StyledRow>
                <Status text={exception.exceptionKey} color="blue" />
                <Tag
                  color={exceptionStatusColor(exception)}
                  text={`${exception.status} · ${exception.severity}`}
                  variant="solid"
                />
              </StyledRow>
              <Label>{exception.reason}</Label>
              <StyledExceptionDetails>
                <span>
                  Expected {formatUsd(exception.expectedCents)} · observed{' '}
                  {formatUsd(exception.observedCents)} · difference{' '}
                  {formatUsd(exception.differenceCents)}
                </span>
                <span><strong>Evidence:</strong> {exception.supportingEvidence}</span>
                <span><strong>Limit:</strong> {exception.limitingEvidence}</span>
                <span><strong>Next:</strong> {exception.nextAction}</span>
              </StyledExceptionDetails>
              <div>
                <Button
                  title="View bounded source trace"
                  variant="secondary"
                  accent="blue"
                  onClick={onTrace}
                />
              </div>
            </StyledRows>
          </CardContent>
        </Card>
      ))}
    </StyledRows>
  </Section>
);

const PreviewStateNotice = ({ state }: { state: PreviewState }) => {
  switch (state) {
    case 'partial':
      return (
        <Callout
          variant="warning"
          title="Partial fixture view"
          description="March card input is stale and April has no data. Totals retain their source coverage labels."
        />
      );
    case 'stale':
      return (
        <Callout
          variant="warning"
          title="Stale fixture view"
          description="One source artifact is stale. No fresh conclusion is promoted from it."
        />
      );
    case 'failed':
      return (
        <Callout
          variant="error"
          title="Fixture read failed closed"
          description="Retry the bounded local preview after checking the fixture receipt."
        />
      );
    case 'denied':
      return (
        <Callout
          variant="error"
          title="Access denied"
          description="The dashboard returned no facts or lineage for this Workspace."
        />
      );
    case 'empty':
      return (
        <Callout
          variant="neutral"
          title="No fixture records"
          description="No authorized synthetic records are available for this Workspace."
        />
      );
    default:
      return null;
  }
};

const FinanceAuditDashboard = () => {
  const [previewState, setPreviewState] = useState<PreviewState>('populated');
  const [showTrace, setShowTrace] = useState(false);
  const data = FIXTURE_DASHBOARD;

  return (
    <StyledDashboard>
      <StyledHeader>
        <StyledHeaderText>
          <H1Title title="Finance audit" />
          <Label>
            Synthetic, read-only review · {data.datasetId} · corrected fixture revision
          </Label>
        </StyledHeaderText>
        <Tag color="green" text="Synthetic only" variant="solid" />
      </StyledHeader>

      <StyledControls>
        <Label>Preview state</Label>
        <ButtonGroup variant="secondary" size="small">
          {PREVIEW_STATES.map((state) => (
            <Button
              accent="blue"
              key={state.value}
              onClick={() => {
                setPreviewState(state.value);
                setShowTrace(false);
              }}
              title={state.label}
              variant={previewState === state.value ? 'primary' : 'secondary'}
            />
          ))}
        </ButtonGroup>
      </StyledControls>

      {previewState === 'loading' ? (
        <StyledState>
          <Loader />
        </StyledState>
      ) : null}

      <PreviewStateNotice state={previewState} />

      {previewState === 'populated' ||
      previewState === 'partial' ||
      previewState === 'stale' ? (
        <>
          <DashboardMetrics data={data} />
          <Coverage data={data} />
          <Exceptions data={data} onTrace={() => setShowTrace(true)} />
          {showTrace ? (
            <Section>
              <H2Title
                title="Can I verify it?"
                description="This bounded trace stays inside the synthetic dataset and ends at an exact artifact row."
              />
              <Card rounded fullWidth>
                <CardContent>
                  <StyledTrace>
                    {data.trace.map((step) => (
                      <li key={`${step.kind}-${step.reference}`}>
                        <strong>{step.kind}</strong> · {step.label} · {step.reference}
                      </li>
                    ))}
                  </StyledTrace>
                </CardContent>
              </Card>
            </Section>
          ) : null}
        </>
      ) : null}
    </StyledDashboard>
  );
};

export default defineFrontComponent({
  universalIdentifier: FINANCE_AUDIT_DASHBOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'finance-audit-dashboard',
  description: 'Synthetic read-only finance coverage, exceptions, and source-lineage preview.',
  component: FinanceAuditDashboard,
});
