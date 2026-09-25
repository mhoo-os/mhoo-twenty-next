export const financeVisibleRecordCoverageLabel = ({
  recordCount,
  isSynthetic,
  truncated,
}: Readonly<{
  recordCount: number;
  isSynthetic: boolean;
  truncated: boolean;
}>) => {
  if (isSynthetic) return `${recordCount} synthetic test records`;
  if (truncated) return `${recordCount} shown · more records available`;
  return `${recordCount} authorized records`;
};

export const financeStatementCoverageLabel = ({
  statementCount,
  truncated,
}: Readonly<{
  statementCount: number;
  truncated: boolean;
}>) => {
  const label = `${statementCount} statement source artifact${statementCount === 1 ? '' : 's'} shown`;
  return truncated
    ? `${label}; a separate Workspace result limit means totals remain withheld from completeness claims.`
    : label;
};
