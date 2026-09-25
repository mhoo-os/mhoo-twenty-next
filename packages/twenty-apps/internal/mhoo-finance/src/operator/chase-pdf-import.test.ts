import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { planChasePdfImport } from './chase-pdf-import';

const bytes = new TextEncoder().encode('%PDF-synthetic-october');
const text = `October 01, 2024 through October 31, 2024\nCHECKING SUMMARY Chase Business Complete Checking\nINSTANCES AMOUNT\nBeginning Balance $100.00\nDeposits and Additions 1 150.00\nChecks Paid 1 -25.00\nEnding Balance 2 $225.00\nDeposits and Additions\n10/03 CREDIT\nEntry $150.00\nChecks Paid\n1234 10/05 -$25.00 RENT\fpage-two\fpage-three\fpage-four\fpage-five\fpage-six\f`;
const input = () => ({
  artifact: { id: 'artifact-id', artifactKey: 'chase-oct-2024', financialAccountId: 'account-id', accountKey: 'masked-1234', period: '2024-10', sourceKind: 'BANK' as const, mimeType: 'application/pdf', originalFileName: 'october.pdf', byteLength: bytes.byteLength, contentHash: createHash('sha256').update(bytes).digest('hex'), acquiredAt: '2026-09-14T00:00:00.000Z', acquiredBy: 'authorized-operator', originalFiles: [{ fileId: 'twenty-file-id' }] },
  financialAccount: { id: 'account-id', sourceKind: 'BANK' as const }, pdfBytes: bytes, extractedText: text,
});

describe('bounded Chase PDF operator plan', () => {
  it('creates a native projection only for a file/account-bound October PDF', () => {
    const plan = planChasePdfImport(input());
    expect(plan).toMatchObject({ status: 'COMPLETE', importedRows: 2 });
    expect(plan.records.financeFacts).toEqual(expect.arrayContaining([expect.objectContaining({ financialAccountId: 'account-id' })]));
  });
  it('is idempotent and resumes from a hash-bound partial checkpoint', () => {
    const partial = planChasePdfImport({ ...input(), maxRows: 1 });
    expect(partial.status).toBe('PARTIAL');
    const complete = planChasePdfImport({ ...input(), priorState: partial.state, maxRows: 1 });
    expect(complete.status).toBe('COMPLETE');
    const replay = planChasePdfImport({ ...input(), priorState: complete.state });
    expect(replay).toMatchObject({ status: 'DUPLICATE_ARTIFACT', importedRows: 0, duplicateRows: 2 });
  });
  it('fails closed for unbound accounts, altered files, wrong periods, and missing Files custody', () => {
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, financialAccountId: null } })).toThrow('FinancialAccount');
    expect(() => planChasePdfImport({ ...input(), pdfBytes: new TextEncoder().encode('other') })).toThrow('hash');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-11' } })).toThrow('controls');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, originalFiles: [] } })).toThrow('Twenty File');
  });
  it('accepts the other reviewed 2024 Chase periods only when controls match', () => {
    const novemberText = text.split('October').join('November').replace('31, 2024', '29, 2024').replace('10/03', '11/03').replace('10/05', '11/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-11' }, extractedText: novemberText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2025-01' } })).toThrow('reviewed');
  });
  it('accepts the reviewed December carry-in window and rejects a shifted boundary', () => {
    const decemberText = text.replace('October 01, 2024 through October 31, 2024', 'November 30, 2024 through December 31, 2024').replace('10/03', '12/03').replace('10/05', '12/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-12' }, extractedText: decemberText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-12' }, extractedText: decemberText.replace('November 30', 'December 01') })).toThrow('control window');
  });
  it('accepts the reviewed December 2023 window and rejects a shifted boundary', () => {
    const decemberText = text.replace('October 01, 2024 through October 31, 2024', 'December 01, 2023 through December 29, 2023').replace('10/03', '12/03').replace('10/05', '12/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-12' }, extractedText: decemberText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-12' }, extractedText: decemberText.replace('December 01', 'December 02') })).toThrow('control window');
  });
  it('accepts the reviewed November 2023 window', () => {
    const novemberText = text.replace('October 01, 2024 through October 31, 2024', 'November 01, 2023 through November 30, 2023').replace('10/03', '11/03').replace('10/05', '11/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-11' }, extractedText: novemberText }).status).toBe('COMPLETE');
  });
  it('infers omitted years for the reviewed December 2023 to January 2024 window', () => {
    const januaryText = text.replace('October 01, 2024 through October 31, 2024', 'December 30, 2023 through January 31, 2024').replace('10/03', '12/30').replace('10/05', '01/05');
    const plan = planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-01' }, extractedText: januaryText });
    expect(plan.status).toBe('COMPLETE');
    expect(plan.records.financeFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ transactionDate: '2023-12-30' }),
      expect.objectContaining({ transactionDate: '2024-01-05' }),
    ]));
  });
  it('accepts the reviewed October 2023 carry-in window and rejects a shifted boundary', () => {
    const octoberText = text.replace('October 01, 2024 through October 31, 2024', 'September 30, 2023 through October 31, 2023').replace('10/03', '10/03').replace('10/05', '10/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-10' }, extractedText: octoberText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-10' }, extractedText: octoberText.replace('September 30', 'October 01') })).toThrow('control window');
  });
  it('accepts the exact reviewed September 2023 window and rejects a shifted boundary', () => {
    const septemberText = text.replace('October 01, 2024 through October 31, 2024', 'September 01, 2023 through September 29, 2023').replace('10/03', '09/03').replace('10/05', '09/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-09' }, extractedText: septemberText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-09' }, extractedText: septemberText.replace('September 01', 'August 31') })).toThrow('control window');
  });
  it('accepts the exact reviewed August 2023 window and rejects a shifted boundary', () => {
    const augustText = text.replace('October 01, 2024 through October 31, 2024', 'August 01, 2023 through August 31, 2023').replace('10/03', '08/03').replace('10/05', '08/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-08' }, extractedText: augustText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-08' }, extractedText: augustText.replace('August 01', 'July 31') })).toThrow('control window');
  });
  it('accepts the exact reviewed July 2023 window and rejects a shifted boundary', () => {
    const julyText = text.replace('October 01, 2024 through October 31, 2024', 'July 01, 2023 through July 31, 2023').replace('10/03', '07/03').replace('10/05', '07/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-07' }, extractedText: julyText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-07' }, extractedText: julyText.replace('July 01', 'June 30') })).toThrow('control window');
  });
  it.each([
    ['2021-08', 'July 31, 2021 through August 31, 2021', 'July 31', 'July 30', '08/03', '08/05'],
    ['2021-09', 'September 01, 2021 through September 30, 2021', 'September 01', 'August 31', '09/03', '09/05'],
    ['2021-10', 'October 01, 2021 through October 29, 2021', 'October 01', 'September 30', '10/03', '10/05'],
    ['2021-11', 'October 30, 2021 through November 30, 2021', 'October 30', 'October 29', '11/03', '11/05'],
    ['2021-12', 'December 01, 2021 through December 31, 2021', 'December 01', 'November 30', '12/03', '12/05'],
    ['2022-01', 'January 01, 2022 through January 31, 2022', 'January 01, 2022', 'December 31, 2021', '01/03', '01/05'],
    ['2022-02', 'February 01, 2022 through February 28, 2022', 'February 01', 'January 31', '02/03', '02/05'],
    ['2022-03', 'March 01, 2022 through March 31, 2022', 'March 01', 'February 28', '03/03', '03/05'],
    ['2022-04', 'April 01, 2022 through April 29, 2022', 'April 01', 'March 31', '04/03', '04/05'],
    ['2022-05', 'April 30, 2022 through May 31, 2022', 'April 30', 'April 29', '05/03', '05/05'],
    ['2022-06', 'June 01, 2022 through June 30, 2022', 'June 01', 'May 31', '06/03', '06/05'],
    ['2022-07', 'July 01, 2022 through July 29, 2022', 'July 01', 'June 30', '07/03', '07/05'],
    ['2022-08', 'July 30, 2022 through August 31, 2022', 'July 30', 'July 29', '08/03', '08/05'],
    ['2022-09', 'September 01, 2022 through September 30, 2022', 'September 01', 'August 31', '09/03', '09/05'],
    ['2022-10', 'October 01, 2022 through October 31, 2022', 'October 01', 'September 30', '10/03', '10/05'],
    ['2022-11', 'November 01, 2022 through November 30, 2022', 'November 01', 'October 31', '11/03', '11/05'],
    ['2022-12', 'December 01, 2022 through December 30, 2022', 'December 01', 'November 30', '12/03', '12/05'],
    ['2023-01', 'December 31, 2022 through January 31, 2023', 'December 31', 'December 30', '01/03', '01/05'],
    ['2023-02', 'February 01, 2023 through February 28, 2023', 'February 01', 'January 31', '02/03', '02/05'],
    ['2023-03', 'March 01, 2023 through March 31, 2023', 'March 01', 'February 28', '03/03', '03/05'],
    ['2023-04', 'April 01, 2023 through April 28, 2023', 'April 01', 'March 31', '04/03', '04/05'],
    ['2023-05', 'April 29, 2023 through May 31, 2023', 'April 29', 'April 28', '05/03', '05/05'],
    ['2023-06', 'June 01, 2023 through June 30, 2023', 'June 01', 'May 31', '06/03', '06/05'],
  ])('accepts the exact reviewed %s window and rejects a shifted boundary', (period, window, start, shiftedStart, transactionOne, transactionTwo) => {
    const reviewedText = text.replace('October 01, 2024 through October 31, 2024', window).replace('10/03', transactionOne).replace('10/05', transactionTwo);
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period }, extractedText: reviewedText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period }, extractedText: reviewedText.replace(start, shiftedStart) })).toThrow('control window');
  });
  it('accepts the reviewed September carry-in window only', () => {
    const septemberText = text.replace('October 01, 2024 through October 31, 2024', 'August 31, 2024 through September 30, 2024').replace('10/03', '09/03').replace('10/05', '09/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-09' }, extractedText: septemberText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-09' }, extractedText: septemberText.replace('August 31', 'September 01') })).toThrow('control window');
  });
  it('accepts the reviewed August window only', () => {
    const augustText = text.replace('October 01, 2024 through October 31, 2024', 'August 01, 2024 through August 30, 2024').replace('10/03', '08/03').replace('10/05', '08/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-08' }, extractedText: augustText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-08' }, extractedText: augustText.replace('August 30', 'August 31') })).toThrow('control window');
  });
  it('accepts the reviewed July carry-in window only', () => {
    const julyText = text.replace('October 01, 2024 through October 31, 2024', 'June 29, 2024 through July 31, 2024').replace('10/03', '07/03').replace('10/05', '07/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-07' }, extractedText: julyText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-07' }, extractedText: julyText.replace('June 29', 'July 01') })).toThrow('control window');
  });
  it('accepts reviewed January through March windows and rejects a leap-day shift', () => {
    const februaryText = text.replace('October 01, 2024 through October 31, 2024', 'February 01, 2024 through February 29, 2024').replace('10/03', '02/03').replace('10/05', '02/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-02' }, extractedText: februaryText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-02' }, extractedText: februaryText.replace('February 29', 'February 28') })).toThrow('control window');
    const marchText = text.replace('October 01, 2024 through October 31, 2024', 'March 01, 2024 through March 29, 2024').replace('10/03', '03/03').replace('10/05', '03/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-03' }, extractedText: marchText }).status).toBe('COMPLETE');
    const januaryText = text.replace('October 01, 2024 through October 31, 2024', 'December 30, 2023 through January 31, 2024').replace('10/03', '01/03').replace('10/05', '01/05');
    expect(planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2024-01' }, extractedText: januaryText }).status).toBe('COMPLETE');
    expect(() => planChasePdfImport({ ...input(), artifact: { ...input().artifact, period: '2023-01' } })).toThrow('reviewed');
  });
});
