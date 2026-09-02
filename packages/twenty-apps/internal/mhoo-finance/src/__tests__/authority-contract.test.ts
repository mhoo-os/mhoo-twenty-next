import { describe, expect, it } from 'vitest';

import {
  evaluateFirstTrancheAuthorization,
  evaluateGate0,
  evaluatePersonalDataAccess,
  evaluateProvenComplete,
  evaluateSourceAcquisition,
  isProvenComplete,
  type FinanceEngagementContract,
  type FirstTrancheAuthorizationForm,
  type PersonalDataAuthorization,
  type ProvenCompleteReceipt,
  type SourceAcquisitionForm,
} from '../engagement/authority-contract';

const SYNTHETIC_HASH = 'a'.repeat(64);
const SYNTHETIC_TIMESTAMP = '2026-01-01T00:00:00Z';
const SYNTHETIC_TIMEZONE = 'Etc/UTC';

const syntheticContract = (): FinanceEngagementContract => ({
  schemaVersion: '1.0',
  contractId: 'synthetic-contract-001',
  revision: 1,
  contentSha256: SYNTHETIC_HASH,
  status: 'APPROVED',
  linear: {
    executionIssue: 'MHO-123',
    isExecutionView: true,
  },
  authority: {
    canonicalRepository: 'mhoo-os/mhoo',
    implementationRepository: 'mhoo-os/mhoo-twenty-next',
    acceptedArchitecture: 'ADR-0008',
    financeProposal: 'ADR-0009',
    financeProposalStatus: 'PROPOSED',
    twentySoleWorkspaceAuthority: true,
  },
  legal: {
    packetReference: 'MHOO-LEGAL-2026-v2.0',
    manifestSha256: SYNTHETIC_HASH,
    dpaStatus: 'EXECUTED_APPROVED',
  },
  engagement: {
    clientLegalEntity: 'Synthetic Client Entity',
    jurisdiction: 'Synthetic Jurisdiction',
    authorizedRepresentatives: ['synthetic-client-representative'],
    representativeAuthorityBasis: 'synthetic-signed-engagement-reference',
    inclusiveStartDate: '2020-01-01',
    inclusiveEndDate: '2025-12-31',
    timezone: SYNTHETIC_TIMEZONE,
    yearBasis: 'CALENDAR',
    yearStartMonth: 1,
    operatingYearDefinition: 'Synthetic calendar-year periods',
    monthCloseRule: 'Synthetic month closes on the final UTC calendar day',
    coveragePeriods: [
      ['2020', '2020-01-01', '2020-12-31'],
      ['2021', '2021-01-01', '2021-12-31'],
      ['2022', '2022-01-01', '2022-12-31'],
      ['2023', '2023-01-01', '2023-12-31'],
      ['2024', '2024-01-01', '2024-12-31'],
      ['2025', '2025-01-01', '2025-12-31'],
    ].map(([periodId, startDate, endDate]) => ({
      periodId,
      startDate,
      endDate,
      timezone: SYNTHETIC_TIMEZONE,
    })),
  },
  cloverScope: {
    status: 'IN_SCOPE',
    merchantReferences: ['synthetic-merchant-001'],
    locationReferences: ['synthetic-location-001'],
    tenderScope: ['synthetic-card-and-cash-tenders'],
    orderTypeScope: ['synthetic-all-approved-order-types'],
    employeeShiftScope: 'synthetic-shift-scope',
    expectedHistoryStart: '2020-01-01',
    expectedHistoryEnd: '2025-12-31',
  },
  inventory: {
    expectedCategories: [
      'BUSINESS_CHECKING',
      'BUSINESS_SAVINGS',
      'BUSINESS_CREDIT_CARD',
      'PROCESSOR_SETTLEMENT',
      'LOAN_OR_LIABILITY',
      'CASH_ACTIVITY',
      'CLOSED_OR_REPLACED_ACCOUNT',
      'OWNER_OR_PERSONAL_ACCOUNT',
    ],
    answers: {
      BUSINESS_CHECKING: {
        status: 'ITEMIZED',
        itemReferences: ['synthetic-business-checking'],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      BUSINESS_SAVINGS: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      BUSINESS_CREDIT_CARD: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      PROCESSOR_SETTLEMENT: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      LOAN_OR_LIABILITY: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      CASH_ACTIVITY: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      CLOSED_OR_REPLACED_ACCOUNT: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
      OWNER_OR_PERSONAL_ACCOUNT: {
        status: 'NONE_KNOWN',
        itemReferences: [],
        attestedBy: 'synthetic-inventory-attestor',
        attestedAt: SYNTHETIC_TIMESTAMP,
      },
    },
    items: [
      {
        inventoryId: 'synthetic-business-checking',
        category: 'BUSINESS_CHECKING',
        maskedDisplayLabel: 'Synthetic Business Account •••• 0001',
        sourceSystem: 'Synthetic Bank',
        sensitivity: 'BUSINESS',
        expectedStartDate: '2020-01-01',
        expectedEndDate: '2025-12-31',
      },
    ],
    closedAccountDiscovery: 'ANSWERED',
    missingPeriodDiscovery: 'ANSWERED',
  },
  reviewers: {
    engagementAdministrator: 'synthetic-engagement-administrator',
    evidenceCustodian: 'synthetic-evidence-custodian',
    analysts: ['synthetic-analyst'],
    restrictedPersonalDataReviewers: [],
    finalReviewers: ['synthetic-final-reviewer'],
    observers: [],
    approvedRecipients: ['synthetic-approved-recipient'],
    recipientRestriction: 'synthetic-recipient-and-purpose-bound',
    roleBindings: {
      engagementAdministrator: 'synthetic-twenty-admin-role',
      evidenceCustodian: 'synthetic-twenty-custodian-role',
      analyst: 'synthetic-twenty-analyst-role',
      restrictedPersonalDataReviewer: 'NOT_AUTHORIZED_PENDING_SEPARATE_CASE',
      finalReviewer: 'synthetic-twenty-final-reviewer-role',
      observer: 'synthetic-twenty-observer-role',
      agent: 'SUMMARY_ONLY_HUMAN_REVIEW_REQUIRED',
    },
  },
  report: {
    workProductName: 'Synthetic factual review report',
    permittedLanguage: 'Received-records and procedure-bounded factual language',
    limitationsReference: 'synthetic-report-limitations-001',
    prohibitedClaims: [
      'AUDIT_OPINION',
      'ASSURANCE_CONCLUSION',
      'TAX_ADVICE_OR_FILING_CONCLUSION',
      'AUTONOMOUS_FRAUD_DETERMINATION',
      'COMPLETE_BUSINESS_ACTIVITY',
    ],
  },
  lifecycle: {
    policyReference: 'synthetic-lifecycle-policy-001',
    retentionClass: 'synthetic-engagement-class',
    startEvent: 'synthetic-acceptance-event',
    expiryRule: 'synthetic-approved-expiry-rule',
    deletionDecision: 'synthetic-delete-after-approved-expiry-and-receipt',
    deletionAuthority: 'synthetic-retention-owner',
    exportDecision: 'synthetic-approved-masked-export-only',
    exportFormatAndChannel: 'synthetic-format-and-controlled-channel',
    exportRecipientRule: 'synthetic-approved-recipients-only',
    legalHoldDecision: 'NO_HOLD',
    legalHoldReference: null,
    legalHoldProcess: 'synthetic-hold-process',
    maskingAndMinimizationRule: 'synthetic-minimum-necessary-masking',
    decisionBy: 'synthetic-lifecycle-decision-owner',
    decisionAt: SYNTHETIC_TIMESTAMP,
  },
  authorizations: {
    sourceAcquisitionStatus: 'NOT_AUTHORIZED',
    sourceAcquisitionFormReferences: [],
    personalDataStatus: 'SEPARATE_REQUIRED',
    personalDataConsentReference: null,
    personalDataCaseReference: null,
    restrictedPersonalRoleReference: null,
    firstTrancheStatus: 'NOT_AUTHORIZED',
    firstTrancheFormReference: null,
  },
  approvals: {
    clientAcceptanceReference: 'synthetic-client-acceptance-001',
    clientApprovedBy: 'synthetic-client-approver',
    clientApprovedAt: SYNTHETIC_TIMESTAMP,
    mhooAcceptanceReference: 'synthetic-mhoo-acceptance-001',
    mhooAcceptedBy: 'synthetic-mhoo-acceptor',
    mhooAcceptedAt: SYNTHETIC_TIMESTAMP,
    reportLanguageApprovedBy: 'synthetic-report-language-approver',
    retentionApprovedBy: 'synthetic-retention-approver',
  },
  nonAuthorizations: {
    providerAccess: false,
    credentialAccess: false,
    customerDataAccess: false,
    import: false,
    deployment: false,
    productionActivation: false,
    personalAccountAccess: false,
  },
});

const businessSourceForm = (
  contract: FinanceEngagementContract,
): SourceAcquisitionForm => ({
  status: 'APPROVED',
  formReference: 'synthetic-source-form-001',
  contractId: contract.contractId,
  inventoryItemId: 'synthetic-business-checking',
  sourceType: 'synthetic-bank-export',
  period: {
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    timezone: SYNTHETIC_TIMEZONE,
  },
  allowedDataClasses: ['synthetic-business-transactions'],
  excludedDataClasses: ['OWNER_OR_PERSONAL_ACCOUNT', 'UNRELATED_RECORDS'],
  deliveryMethod: 'synthetic-secure-client-delivery',
  credentialOwnerReference: 'synthetic-client-controlled-credential-path',
  credentialValuesPresent: false,
  businessOnly: true,
  personalDataIncluded: false,
  readOnly: true,
  custodyManifestPlan: 'synthetic-immutable-manifest-plan',
  operatorReference: 'synthetic-source-operator',
  reviewerReference: 'synthetic-source-reviewer',
  approvedBy: 'synthetic-source-approver',
  approvedAt: SYNTHETIC_TIMESTAMP,
});

const personalDataForm = (): PersonalDataAuthorization => ({
  status: 'APPROVED',
  caseReference: 'synthetic-personal-case-001',
  businessLinkedFlow: 'synthetic-business-linked-flow',
  period: {
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    timezone: SYNTHETIC_TIMEZONE,
  },
  consentReference: 'synthetic-joint-owner-consent-001',
  legalPrivacyReference: 'synthetic-privacy-decision-001',
  restrictedReviewerReference: 'synthetic-restricted-reviewer',
  twentyRoleBindingReference: 'synthetic-restricted-twenty-role',
  maskingRule: 'synthetic-minimum-necessary-mask',
  permittedRecipients: ['synthetic-restricted-recipient'],
  expiryRule: 'synthetic-case-expiry',
  approvedBy: 'synthetic-personal-data-approver',
  approvedAt: SYNTHETIC_TIMESTAMP,
});

const firstTrancheForm = (
  contract: FinanceEngagementContract,
): FirstTrancheAuthorizationForm => ({
  status: 'APPROVED',
  formReference: 'synthetic-first-tranche-001',
  engagementContractId: contract.contractId,
  acceptanceReceiptReference: 'synthetic-acceptance-receipt-001',
  legalAndLifecycleReceiptReference: 'synthetic-lifecycle-receipt-001',
  runtimeGateReceiptReference: 'synthetic-runtime-gate-receipt-001',
  emptyWorkspaceReceiptReference: 'synthetic-empty-workspace-receipt-001',
  workspaceRoleBindingReceiptReference: 'synthetic-role-binding-receipt-001',
  source: {
    inventoryItemId: 'synthetic-business-checking',
    sourceType: 'synthetic-bank-export',
    maskedSourceReference: 'Synthetic Business Account •••• 0001',
    businessOnly: true,
    personalDataIncluded: false,
    exactStartDate: '2024-01-01',
    exactEndDate: '2024-03-31',
    timezone: SYNTHETIC_TIMEZONE,
    allowedDataClasses: ['synthetic-business-transactions'],
    excludedDataClasses: ['OWNER_OR_PERSONAL_ACCOUNT', 'UNRELATED_RECORDS'],
    deliveryMethod: 'synthetic-secure-client-delivery',
    credentialOwnerReference: 'synthetic-client-controlled-credential-path',
    credentialValuesInForm: false,
  },
  controls: {
    parserOrImporterVersion: 'synthetic-importer-1.0.0',
    custodyManifestPlan: 'synthetic-immutable-manifest-plan',
    operatorReference: 'synthetic-tranche-operator',
    reviewerReference: 'synthetic-tranche-reviewer',
    rollbackOrDeletionPlan: 'synthetic-delete-and-rollback-plan',
    sourceLimitAndFailurePath: 'synthetic-source-limit-receipt-path',
    explicitPartialStatement:
      'This tranche is partial and does not prove six-year completeness.',
    noProductionActivation: true,
  },
  approval: {
    authorizedBy: 'synthetic-tranche-authorizer',
    authorizedAt: SYNTHETIC_TIMESTAMP,
    authorizationReference: 'synthetic-tranche-authorization-001',
  },
});

describe('Gate 0 authority contract', () => {
  it('approves a complete synthetic contract but grants no live effects', () => {
    const decision = evaluateGate0(syntheticContract());

    expect(decision.gate0Approved).toBe(true);
    expect(decision.reasons).toEqual([]);
    expect(decision.mayPrepareSyntheticFixtures).toBe(true);
    expect(decision.mayAcquireBusinessSourceData).toBe(false);
    expect(decision.mayAccessPersonalAccountData).toBe(false);
    expect(decision.mayUseCredentials).toBe(false);
    expect(decision.mayImport).toBe(false);
    expect(decision.mayDeploy).toBe(false);
    expect(decision.mayActivateProduction).toBe(false);
  });

  it('seals accepted and rejected decisions against mutation and round-trip forgery', () => {
    const accepted = evaluateGate0(syntheticContract());
    const rejectedContract = syntheticContract();
    rejectedContract.engagement.clientLegalEntity = 'UNRESOLVED';
    const rejected = evaluateGate0(rejectedContract);

    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(accepted.reasons)).toBe(true);
    expect(Object.isFrozen(rejected)).toBe(true);
    expect(Object.isFrozen(rejected.reasons)).toBe(true);
    expect(JSON.parse(JSON.stringify(accepted))).not.toHaveProperty('#brand');
  });

  it('rejects unresolved client facts and non-contiguous coverage', () => {
    const contract = syntheticContract();
    contract.engagement.clientLegalEntity = 'UNRESOLVED';
    contract.engagement.coveragePeriods[2].startDate = '2022-01-02';

    const decision = evaluateGate0(contract);

    expect(decision.gate0Approved).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'client, representative, timezone, year, and month-close scope is unresolved',
        'coverage period 3 is not contiguous with the prior period',
      ]),
    );
  });

  it('requires every inventory category to be answered and item references to resolve', () => {
    const contract = syntheticContract();
    contract.inventory.answers.BUSINESS_SAVINGS.status = 'UNRESOLVED';
    contract.inventory.answers.BUSINESS_CHECKING.itemReferences = ['missing-item'];

    const decision = evaluateGate0(contract);

    expect(decision.gate0Approved).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'inventory category BUSINESS_SAVINGS remains unresolved',
        'inventory category BUSINESS_CHECKING references an unknown item',
      ]),
    );
  });

  it('requires reviewer, lifecycle, and prohibited-report-language boundaries', () => {
    const contract = syntheticContract();
    contract.reviewers.finalReviewers = [];
    contract.lifecycle.exportDecision = '';
    contract.report.prohibitedClaims = ['AUDIT_OPINION'];

    const decision = evaluateGate0(contract);

    expect(decision.gate0Approved).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'administrator, custodian, analyst, final reviewer, and recipient boundaries are required',
        'retention, deletion, export, and legal-hold decisions must be concrete',
        'report must prohibit ASSURANCE_CONCLUSION',
      ]),
    );
  });
});

describe('bounded acquisition and personal-data gates', () => {
  it('keeps source acquisition, import, credentials, and production separate', () => {
    const contract = syntheticContract();
    const decision = evaluateSourceAcquisition(contract, businessSourceForm(contract));

    expect(decision.authorized).toBe(true);
    expect(decision.mayReceiveBusinessSourceData).toBe(true);
    expect(decision.mayAccessPersonalAccountData).toBe(false);
    expect(decision.mayUseCredentials).toBe(false);
    expect(decision.mayImport).toBe(false);
    expect(decision.mayDeploy).toBe(false);
    expect(decision.mayActivateProduction).toBe(false);
  });

  it('rejects an out-of-range source form and an unavailable DPA', () => {
    const contract = syntheticContract();
    const form = businessSourceForm(contract);
    form.period.startDate = '2019-01-01';
    contract.legal.dpaStatus = 'UNAVAILABLE_FAIL_CLOSED';

    const decision = evaluateSourceAcquisition(contract, form);

    expect(decision.authorized).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'source form period is outside the approved engagement range',
        'live source acquisition is blocked until the DPA is executed and approved',
      ]),
    );
  });

  it('does not inherit personal access from the business contract', () => {
    const contract = syntheticContract();
    const form = personalDataForm();

    const withoutAmendment = evaluatePersonalDataAccess(contract, form);
    expect(withoutAmendment.authorized).toBe(false);
    expect(withoutAmendment.mayAccessPersonalAccountData).toBe(false);

    contract.authorizations.personalDataStatus = 'APPROVED_BY_AMENDMENT';
    contract.authorizations.personalDataConsentReference = form.consentReference;
    contract.authorizations.personalDataCaseReference = form.caseReference;
    contract.authorizations.restrictedPersonalRoleReference =
      form.twentyRoleBindingReference;
    contract.reviewers.restrictedPersonalDataReviewers = [form.restrictedReviewerReference];
    contract.reviewers.roleBindings.restrictedPersonalDataReviewer =
      form.twentyRoleBindingReference;

    const withAmendment = evaluatePersonalDataAccess(contract, form);
    expect(withAmendment.authorized).toBe(true);
    expect(withAmendment.mayAccessPersonalAccountData).toBe(true);
    expect(withAmendment.mayUseCredentials).toBe(false);
    expect(withAmendment.mayExportUnmasked).toBe(false);
  });
});

describe('first tranche and coverage receipts', () => {
  it('requires explicit dependency receipts and partial language', () => {
    const contract = syntheticContract();
    const form = firstTrancheForm(contract);
    form.acceptanceReceiptReference = 'UNRESOLVED';
    form.controls.explicitPartialStatement = 'one small import';

    const decision = evaluateFirstTrancheAuthorization(contract, form);

    expect(decision.authorized).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'first-tranche required receipt or control is unresolved',
        'first tranche must state that it is partial and does not prove six-year completeness',
      ]),
    );
  });

  it('authorizes only the exact synthetic business tranche and keeps effects bounded', () => {
    const contract = syntheticContract();
    const decision = evaluateFirstTrancheAuthorization(
      contract,
      firstTrancheForm(contract),
    );

    expect(decision.authorized).toBe(true);
    expect(decision.mayReceiveBusinessSourceData).toBe(true);
    expect(decision.mayImportBusinessData).toBe(true);
    expect(decision.mayAccessPersonalAccountData).toBe(false);
    expect(decision.mayUseCredentials).toBe(false);
    expect(decision.mayDeploy).toBe(false);
    expect(decision.mayActivateProduction).toBe(false);
  });

  it('requires all PROVEN_COMPLETE conjuncts', () => {
    const incomplete: ProvenCompleteReceipt = {
      approvedEngagementScope: true,
      expectedSourceAccountInventoryAttested: true,
      immutableEvidenceAndManifestPreserved: true,
      sourceSpecificCompletenessControlPassed: true,
      allEligiblePeriodsClassified: true,
      requiredCrossSourceReconciliationPassed: false,
      procedureInputSnapshotPreserved: true,
      reproducibleCoverageReceiptGenerated: true,
      authorizedHumanReviewerSignedOff: true,
      reportLimitationsRecorded: true,
    };
    const incompleteDecision = evaluateProvenComplete(incomplete);
    expect(incompleteDecision.provenComplete).toBe(false);
    expect(incompleteDecision.status).toBe('NOT_PROVEN_COMPLETE');
    expect(isProvenComplete(incomplete)).toBe(false);

    const complete = {
      ...incomplete,
      requiredCrossSourceReconciliationPassed: true,
    };
    const completeDecision = evaluateProvenComplete(complete);
    expect(completeDecision.provenComplete).toBe(true);
    expect(completeDecision.status).toBe('PROVEN_COMPLETE');
    expect(isProvenComplete(complete)).toBe(true);
    expect(Object.isFrozen(completeDecision)).toBe(true);
    expect(Object.isFrozen(completeDecision.reasons)).toBe(true);
  });
});
