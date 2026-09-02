export const CONTRACT_SCHEMA_VERSION = '1.0' as const;
export const LINEAR_EXECUTION_ISSUE = 'MHO-123' as const;

export const REQUIRED_INVENTORY_CATEGORIES = [
  'BUSINESS_CHECKING',
  'BUSINESS_SAVINGS',
  'BUSINESS_CREDIT_CARD',
  'PROCESSOR_SETTLEMENT',
  'LOAN_OR_LIABILITY',
  'CASH_ACTIVITY',
  'CLOSED_OR_REPLACED_ACCOUNT',
  'OWNER_OR_PERSONAL_ACCOUNT',
] as const;

export type InventoryCategory =
  (typeof REQUIRED_INVENTORY_CATEGORIES)[number];

export const REQUIRED_ROLE_BINDINGS = [
  'engagementAdministrator',
  'evidenceCustodian',
  'analyst',
  'restrictedPersonalDataReviewer',
  'finalReviewer',
  'observer',
  'agent',
] as const;

export type RoleBinding = (typeof REQUIRED_ROLE_BINDINGS)[number];

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_CLIENT_INPUT'
  | 'READY_FOR_ACCEPTANCE'
  | 'APPROVED'
  | 'SUPERSEDED'
  | 'CLOSED'
  | 'REVOKED';

export type InventoryAnswerStatus =
  | 'ITEMIZED'
  | 'NONE_KNOWN'
  | 'UNRESOLVED';

export type CoverageStatus =
  | 'PROVEN_COMPLETE'
  | 'SOURCE_COMPLETE_UNRECONCILED'
  | 'PARTIAL'
  | 'MISSING'
  | 'OUT_OF_SCOPE'
  | 'SUPERSEDED';

export type DateRange = {
  startDate: string;
  endDate: string;
  timezone: string;
};

export type CoveragePeriod = DateRange & {
  periodId: string;
};

export type InventoryAttestation = {
  status: InventoryAnswerStatus;
  itemReferences: string[];
  attestedBy: string | null;
  attestedAt: string | null;
};

export type InventoryItem = {
  inventoryId: string;
  category: InventoryCategory;
  maskedDisplayLabel: string;
  sourceSystem: string;
  sensitivity: 'BUSINESS' | 'RESTRICTED_PERSONAL';
  expectedStartDate: string | null;
  expectedEndDate: string | null;
};

export type FinanceEngagementContract = {
  schemaVersion: typeof CONTRACT_SCHEMA_VERSION;
  contractId: string;
  revision: number;
  contentSha256: string;
  status: ContractStatus;
  linear: {
    executionIssue: typeof LINEAR_EXECUTION_ISSUE;
    isExecutionView: true;
  };
  authority: {
    canonicalRepository: 'mhoo-os/mhoo';
    implementationRepository: 'mhoo-os/mhoo-twenty-next';
    acceptedArchitecture: 'ADR-0008';
    financeProposal: 'ADR-0009';
    financeProposalStatus: 'PROPOSED';
    twentySoleWorkspaceAuthority: true;
  };
  legal: {
    packetReference: 'MHOO-LEGAL-2026-v2.0';
    manifestSha256: string;
    dpaStatus: 'EXECUTED_APPROVED' | 'UNAVAILABLE_FAIL_CLOSED';
  };
  engagement: {
    clientLegalEntity: string;
    jurisdiction: string;
    authorizedRepresentatives: string[];
    representativeAuthorityBasis: string;
    inclusiveStartDate: string;
    inclusiveEndDate: string;
    timezone: string;
    yearBasis: 'CALENDAR' | 'FISCAL' | 'OPERATING';
    yearStartMonth: number;
    operatingYearDefinition: string;
    monthCloseRule: string;
    coveragePeriods: CoveragePeriod[];
  };
  cloverScope: {
    status: 'IN_SCOPE' | 'OUT_OF_SCOPE';
    merchantReferences: string[];
    locationReferences: string[];
    tenderScope: string[];
    orderTypeScope: string[];
    employeeShiftScope: string;
    expectedHistoryStart: string | null;
    expectedHistoryEnd: string | null;
  };
  inventory: {
    expectedCategories: InventoryCategory[];
    answers: Record<InventoryCategory, InventoryAttestation>;
    items: InventoryItem[];
    closedAccountDiscovery: 'ANSWERED';
    missingPeriodDiscovery: 'ANSWERED';
  };
  reviewers: {
    engagementAdministrator: string;
    evidenceCustodian: string;
    analysts: string[];
    restrictedPersonalDataReviewers: string[];
    finalReviewers: string[];
    observers: string[];
    approvedRecipients: string[];
    recipientRestriction: string;
    roleBindings: Record<RoleBinding, string>;
  };
  report: {
    workProductName: string;
    permittedLanguage: string;
    limitationsReference: string;
    prohibitedClaims: string[];
  };
  lifecycle: {
    policyReference: string;
    retentionClass: string;
    startEvent: string;
    expiryRule: string;
    deletionDecision: string;
    deletionAuthority: string;
    exportDecision: string;
    exportFormatAndChannel: string;
    exportRecipientRule: string;
    legalHoldDecision: 'NO_HOLD' | 'HOLD_IN_EFFECT';
    legalHoldReference: string | null;
    legalHoldProcess: string;
    maskingAndMinimizationRule: string;
    decisionBy: string;
    decisionAt: string;
  };
  authorizations: {
    sourceAcquisitionStatus: 'NOT_AUTHORIZED' | 'FORM_REFERENCED';
    sourceAcquisitionFormReferences: string[];
    personalDataStatus:
      | 'SEPARATE_REQUIRED'
      | 'NOT_IN_SCOPE'
      | 'APPROVED_BY_AMENDMENT';
    personalDataConsentReference: string | null;
    personalDataCaseReference: string | null;
    restrictedPersonalRoleReference: string | null;
    firstTrancheStatus: 'NOT_AUTHORIZED' | 'FORM_REFERENCED';
    firstTrancheFormReference: string | null;
  };
  approvals: {
    clientAcceptanceReference: string;
    clientApprovedBy: string;
    clientApprovedAt: string;
    mhooAcceptanceReference: string;
    mhooAcceptedBy: string;
    mhooAcceptedAt: string;
    reportLanguageApprovedBy: string;
    retentionApprovedBy: string;
  };
  nonAuthorizations: {
    providerAccess: false;
    credentialAccess: false;
    customerDataAccess: false;
    import: false;
    deployment: false;
    productionActivation: false;
    personalAccountAccess: false;
  };
};

type Gate0DecisionFields = {
  gate0Approved: boolean;
  reasons: string[];
  mayPrepareSyntheticFixtures: true;
  mayAcquireBusinessSourceData: false;
  mayAccessPersonalAccountData: false;
  mayUseCredentials: false;
  mayImport: false;
  mayDeploy: false;
  mayActivateProduction: false;
};

const DECISION_SEAL = Symbol('mhoo-finance-decision-seal');
type DecisionSeal = typeof DECISION_SEAL;

class Gate0Decision {
  readonly #brand: DecisionSeal;
  readonly gate0Approved: boolean;
  readonly reasons: ReadonlyArray<string>;
  readonly mayPrepareSyntheticFixtures: true;
  readonly mayAcquireBusinessSourceData: false;
  readonly mayAccessPersonalAccountData: false;
  readonly mayUseCredentials: false;
  readonly mayImport: false;
  readonly mayDeploy: false;
  readonly mayActivateProduction: false;

  constructor(seal: DecisionSeal, fields: Gate0DecisionFields) {
    if (seal !== DECISION_SEAL) {
      throw new TypeError('Gate0Decision can only be created by its evaluator');
    }
    this.#brand = DECISION_SEAL;
    this.gate0Approved = fields.gate0Approved;
    this.reasons = Object.freeze([...fields.reasons]);
    this.mayPrepareSyntheticFixtures = fields.mayPrepareSyntheticFixtures;
    this.mayAcquireBusinessSourceData = fields.mayAcquireBusinessSourceData;
    this.mayAccessPersonalAccountData = fields.mayAccessPersonalAccountData;
    this.mayUseCredentials = fields.mayUseCredentials;
    this.mayImport = fields.mayImport;
    this.mayDeploy = fields.mayDeploy;
    this.mayActivateProduction = fields.mayActivateProduction;
    Object.freeze(this);
  }

}

export type SourceAcquisitionForm = {
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  formReference: string;
  contractId: string;
  inventoryItemId: string;
  sourceType: string;
  period: DateRange;
  allowedDataClasses: string[];
  excludedDataClasses: string[];
  deliveryMethod: string;
  credentialOwnerReference: string;
  credentialValuesPresent: false;
  businessOnly: true;
  personalDataIncluded: false;
  readOnly: true;
  custodyManifestPlan: string;
  operatorReference: string;
  reviewerReference: string;
  approvedBy: string;
  approvedAt: string;
};

type SourceAcquisitionDecisionFields = {
  authorized: boolean;
  reasons: string[];
  mayReceiveBusinessSourceData: boolean;
  mayAccessPersonalAccountData: false;
  mayUseCredentials: false;
  mayImport: false;
  mayDeploy: false;
  mayActivateProduction: false;
};

class SourceAcquisitionDecision {
  readonly #brand: DecisionSeal;
  readonly authorized: boolean;
  readonly reasons: ReadonlyArray<string>;
  readonly mayReceiveBusinessSourceData: boolean;
  readonly mayAccessPersonalAccountData: false;
  readonly mayUseCredentials: false;
  readonly mayImport: false;
  readonly mayDeploy: false;
  readonly mayActivateProduction: false;

  constructor(seal: DecisionSeal, fields: SourceAcquisitionDecisionFields) {
    if (seal !== DECISION_SEAL) {
      throw new TypeError('SourceAcquisitionDecision can only be created by its evaluator');
    }
    this.#brand = DECISION_SEAL;
    this.authorized = fields.authorized;
    this.reasons = Object.freeze([...fields.reasons]);
    this.mayReceiveBusinessSourceData = fields.mayReceiveBusinessSourceData;
    this.mayAccessPersonalAccountData = fields.mayAccessPersonalAccountData;
    this.mayUseCredentials = fields.mayUseCredentials;
    this.mayImport = fields.mayImport;
    this.mayDeploy = fields.mayDeploy;
    this.mayActivateProduction = fields.mayActivateProduction;
    Object.freeze(this);
  }

}

export type PersonalDataAuthorization = {
  status: 'DRAFT' | 'APPROVED' | 'REVOKED';
  caseReference: string;
  businessLinkedFlow: string;
  period: DateRange;
  consentReference: string;
  legalPrivacyReference: string;
  restrictedReviewerReference: string;
  twentyRoleBindingReference: string;
  maskingRule: string;
  permittedRecipients: string[];
  expiryRule: string;
  approvedBy: string;
  approvedAt: string;
};

type PersonalDataDecisionFields = {
  authorized: boolean;
  reasons: string[];
  mayAccessPersonalAccountData: boolean;
  mayUseCredentials: false;
  mayImport: boolean;
  mayExportUnmasked: false;
  mayDeploy: false;
  mayActivateProduction: false;
};

class PersonalDataDecision {
  readonly #brand: DecisionSeal;
  readonly authorized: boolean;
  readonly reasons: ReadonlyArray<string>;
  readonly mayAccessPersonalAccountData: boolean;
  readonly mayUseCredentials: false;
  readonly mayImport: boolean;
  readonly mayExportUnmasked: false;
  readonly mayDeploy: false;
  readonly mayActivateProduction: false;

  constructor(seal: DecisionSeal, fields: PersonalDataDecisionFields) {
    if (seal !== DECISION_SEAL) {
      throw new TypeError('PersonalDataDecision can only be created by its evaluator');
    }
    this.#brand = DECISION_SEAL;
    this.authorized = fields.authorized;
    this.reasons = Object.freeze([...fields.reasons]);
    this.mayAccessPersonalAccountData = fields.mayAccessPersonalAccountData;
    this.mayUseCredentials = fields.mayUseCredentials;
    this.mayImport = fields.mayImport;
    this.mayExportUnmasked = fields.mayExportUnmasked;
    this.mayDeploy = fields.mayDeploy;
    this.mayActivateProduction = fields.mayActivateProduction;
    Object.freeze(this);
  }

}

export type FirstTrancheAuthorizationForm = {
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  formReference: string;
  engagementContractId: string;
  acceptanceReceiptReference: string;
  legalAndLifecycleReceiptReference: string;
  runtimeGateReceiptReference: string;
  emptyWorkspaceReceiptReference: string;
  workspaceRoleBindingReceiptReference: string;
  source: {
    inventoryItemId: string;
    sourceType: string;
    maskedSourceReference: string;
    businessOnly: true;
    personalDataIncluded: false;
    exactStartDate: string;
    exactEndDate: string;
    timezone: string;
    allowedDataClasses: string[];
    excludedDataClasses: string[];
    deliveryMethod: string;
    credentialOwnerReference: string;
    credentialValuesInForm: false;
  };
  controls: {
    parserOrImporterVersion: string;
    custodyManifestPlan: string;
    operatorReference: string;
    reviewerReference: string;
    rollbackOrDeletionPlan: string;
    sourceLimitAndFailurePath: string;
    explicitPartialStatement: string;
    noProductionActivation: true;
  };
  approval: {
    authorizedBy: string;
    authorizedAt: string;
    authorizationReference: string;
  };
};

type FirstTrancheDecisionFields = {
  authorized: boolean;
  reasons: string[];
  mayReceiveBusinessSourceData: boolean;
  mayImportBusinessData: boolean;
  mayAccessPersonalAccountData: false;
  mayUseCredentials: false;
  mayDeploy: false;
  mayActivateProduction: false;
};

class FirstTrancheDecision {
  readonly #brand: DecisionSeal;
  readonly authorized: boolean;
  readonly reasons: ReadonlyArray<string>;
  readonly mayReceiveBusinessSourceData: boolean;
  readonly mayImportBusinessData: boolean;
  readonly mayAccessPersonalAccountData: false;
  readonly mayUseCredentials: false;
  readonly mayDeploy: false;
  readonly mayActivateProduction: false;

  constructor(seal: DecisionSeal, fields: FirstTrancheDecisionFields) {
    if (seal !== DECISION_SEAL) {
      throw new TypeError('FirstTrancheDecision can only be created by its evaluator');
    }
    this.#brand = DECISION_SEAL;
    this.authorized = fields.authorized;
    this.reasons = Object.freeze([...fields.reasons]);
    this.mayReceiveBusinessSourceData = fields.mayReceiveBusinessSourceData;
    this.mayImportBusinessData = fields.mayImportBusinessData;
    this.mayAccessPersonalAccountData = fields.mayAccessPersonalAccountData;
    this.mayUseCredentials = fields.mayUseCredentials;
    this.mayDeploy = fields.mayDeploy;
    this.mayActivateProduction = fields.mayActivateProduction;
    Object.freeze(this);
  }

}

export type ProvenCompleteReceipt = {
  approvedEngagementScope: boolean;
  expectedSourceAccountInventoryAttested: boolean;
  immutableEvidenceAndManifestPreserved: boolean;
  sourceSpecificCompletenessControlPassed: boolean;
  allEligiblePeriodsClassified: boolean;
  requiredCrossSourceReconciliationPassed: boolean;
  procedureInputSnapshotPreserved: boolean;
  reproducibleCoverageReceiptGenerated: boolean;
  authorizedHumanReviewerSignedOff: boolean;
  reportLimitationsRecorded: boolean;
};

type ProvenCompleteDecisionFields = {
  provenComplete: boolean;
  reasons: string[];
};

class ProvenCompleteDecision {
  readonly #brand: DecisionSeal;
  readonly provenComplete: boolean;
  readonly status: 'PROVEN_COMPLETE' | 'NOT_PROVEN_COMPLETE';
  readonly reasons: ReadonlyArray<string>;

  constructor(seal: DecisionSeal, fields: ProvenCompleteDecisionFields) {
    if (seal !== DECISION_SEAL) {
      throw new TypeError('ProvenCompleteDecision can only be created by its evaluator');
    }
    this.#brand = DECISION_SEAL;
    this.provenComplete = fields.provenComplete;
    this.status = fields.provenComplete ? 'PROVEN_COMPLETE' : 'NOT_PROVEN_COMPLETE';
    this.reasons = Object.freeze([...fields.reasons]);
    Object.freeze(this);
  }

}

const PROHIBITED_CLAIMS = [
  'AUDIT_OPINION',
  'ASSURANCE_CONCLUSION',
  'TAX_ADVICE_OR_FILING_CONCLUSION',
  'AUTONOMOUS_FRAUD_DETERMINATION',
  'COMPLETE_BUSINESS_ACTIVITY',
] as const;

const PLACEHOLDER_PATTERN =
  /(?:<|>|\b(?:UNRESOLVED|UNKNOWN|PENDING|NOT ANSWERED|TBD|NULL)\b)/i;

const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const hasConcreteText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !PLACEHOLDER_PATTERN.test(value);

const hasSha256 = (value: string): boolean => SHA256_PATTERN.test(value);

const isIsoDate = (value: string): boolean => {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isIsoTimestamp = (value: string): boolean =>
  ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());

const nextDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const isInside = (candidate: DateRange, boundary: DateRange): boolean =>
  isIsoDate(candidate.startDate) &&
  isIsoDate(candidate.endDate) &&
  candidate.timezone === boundary.timezone &&
  candidate.startDate >= boundary.startDate &&
  candidate.endDate <= boundary.endDate;

const addReasonIf = (
  reasons: string[],
  condition: boolean,
  reason: string,
): void => {
  if (condition) {
    reasons.push(reason);
  }
};

const hasRequiredInventoryShape = (
  contract: FinanceEngagementContract,
  reasons: string[],
): void => {
  const expected = [...contract.inventory.expectedCategories].sort();
  const required = [...REQUIRED_INVENTORY_CATEGORIES].sort();
  addReasonIf(
    reasons,
    expected.join('|') !== required.join('|'),
    'source inventory must include exactly the eight required categories',
  );

  const itemIds = new Set(contract.inventory.items.map((item) => item.inventoryId));
  for (const category of REQUIRED_INVENTORY_CATEGORIES) {
    const answer = contract.inventory.answers[category];
    addReasonIf(
      reasons,
      !answer || !hasConcreteText(answer.attestedBy) || !isIsoTimestamp(answer.attestedAt ?? ''),
      `inventory category ${category} lacks an attestation`,
    );
    if (!answer) {
      continue;
    }

    addReasonIf(
      reasons,
      answer.status === 'UNRESOLVED',
      `inventory category ${category} remains unresolved`,
    );
    addReasonIf(
      reasons,
      answer.status === 'NONE_KNOWN' && answer.itemReferences.length > 0,
      `inventory category ${category} cannot have items when NONE_KNOWN`,
    );
    addReasonIf(
      reasons,
      answer.status === 'ITEMIZED' && answer.itemReferences.length === 0,
      `inventory category ${category} needs item references when ITEMIZED`,
    );
    for (const itemReference of answer.itemReferences) {
      addReasonIf(
        reasons,
        !itemIds.has(itemReference),
        `inventory category ${category} references an unknown item`,
      );
    }
  }

  addReasonIf(
    reasons,
    contract.inventory.closedAccountDiscovery !== 'ANSWERED',
    'closed/replaced-account discovery must be answered',
  );
  addReasonIf(
    reasons,
    contract.inventory.missingPeriodDiscovery !== 'ANSWERED',
    'missing-period discovery must be answered',
  );
};

const hasSixContiguousPeriods = (
  contract: FinanceEngagementContract,
  reasons: string[],
): void => {
  const { engagement } = contract;
  addReasonIf(
    reasons,
    !isIsoDate(engagement.inclusiveStartDate) || !isIsoDate(engagement.inclusiveEndDate),
    'inclusive engagement dates must be valid ISO dates',
  );
  addReasonIf(
    reasons,
    engagement.coveragePeriods.length !== 6,
    'exactly six coverage periods are required',
  );

  engagement.coveragePeriods.forEach((period, index) => {
    addReasonIf(
      reasons,
      !hasConcreteText(period.periodId) ||
        !isIsoDate(period.startDate) ||
        !isIsoDate(period.endDate) ||
        !hasConcreteText(period.timezone),
      `coverage period ${index + 1} is not concrete`,
    );
    addReasonIf(
      reasons,
      isIsoDate(period.startDate) &&
        isIsoDate(period.endDate) &&
        period.startDate > period.endDate,
      `coverage period ${index + 1} has reversed dates`,
    );
    addReasonIf(
      reasons,
      hasConcreteText(period.timezone) && period.timezone !== engagement.timezone,
      `coverage period ${index + 1} uses a different timezone`,
    );
    if (index > 0) {
      const previous = engagement.coveragePeriods[index - 1];
      addReasonIf(
        reasons,
        isIsoDate(previous.endDate) && period.startDate !== nextDate(previous.endDate),
        `coverage period ${index + 1} is not contiguous with the prior period`,
      );
    }
  });

  const first = engagement.coveragePeriods[0];
  const last = engagement.coveragePeriods[engagement.coveragePeriods.length - 1];
  if (first && last) {
    addReasonIf(
      reasons,
      first.startDate !== engagement.inclusiveStartDate ||
        last.endDate !== engagement.inclusiveEndDate,
      'coverage periods must exactly span the inclusive engagement dates',
    );
  }
};

const hasReviewAndReportBoundary = (
  contract: FinanceEngagementContract,
  reasons: string[],
): void => {
  const { reviewers, report } = contract;
  addReasonIf(
    reasons,
    !hasConcreteText(reviewers.engagementAdministrator) ||
      !hasConcreteText(reviewers.evidenceCustodian) ||
      reviewers.analysts.length === 0 ||
      reviewers.finalReviewers.length === 0 ||
      reviewers.approvedRecipients.length === 0 ||
      !hasConcreteText(reviewers.recipientRestriction),
    'administrator, custodian, analyst, final reviewer, and recipient boundaries are required',
  );
  for (const role of REQUIRED_ROLE_BINDINGS) {
    addReasonIf(
      reasons,
      !hasConcreteText(reviewers.roleBindings[role]),
      `Twenty role binding is missing for ${role}`,
    );
  }
  if (contract.authorizations.personalDataStatus === 'SEPARATE_REQUIRED') {
    addReasonIf(
      reasons,
      reviewers.roleBindings.restrictedPersonalDataReviewer !==
        'NOT_AUTHORIZED_PENDING_SEPARATE_CASE',
      'restricted personal-data role must remain explicitly unauthorized',
    );
  }
  addReasonIf(
    reasons,
    !hasConcreteText(report.workProductName) ||
      !hasConcreteText(report.permittedLanguage) ||
      !hasConcreteText(report.limitationsReference),
    'report name, permitted language, and limitations reference are required',
  );
  for (const claim of PROHIBITED_CLAIMS) {
    addReasonIf(
      reasons,
      !report.prohibitedClaims.includes(claim),
      `report must prohibit ${claim}`,
    );
  }
};

const hasLifecycleBoundary = (
  contract: FinanceEngagementContract,
  reasons: string[],
): void => {
  const lifecycle = contract.lifecycle;
  addReasonIf(
    reasons,
    !hasConcreteText(lifecycle.policyReference) ||
      !hasConcreteText(lifecycle.retentionClass) ||
      !hasConcreteText(lifecycle.startEvent) ||
      !hasConcreteText(lifecycle.expiryRule) ||
      !hasConcreteText(lifecycle.deletionDecision) ||
      !hasConcreteText(lifecycle.deletionAuthority) ||
      !hasConcreteText(lifecycle.exportDecision) ||
      !hasConcreteText(lifecycle.exportFormatAndChannel) ||
      !hasConcreteText(lifecycle.exportRecipientRule) ||
      !hasConcreteText(lifecycle.legalHoldProcess) ||
      !hasConcreteText(lifecycle.maskingAndMinimizationRule) ||
      !hasConcreteText(lifecycle.decisionBy) ||
      !isIsoTimestamp(lifecycle.decisionAt),
    'retention, deletion, export, and legal-hold decisions must be concrete',
  );
  addReasonIf(
    reasons,
    lifecycle.legalHoldDecision === 'HOLD_IN_EFFECT' &&
      !hasConcreteText(lifecycle.legalHoldReference),
    'an active legal hold requires a hold reference',
  );
};

const hasApprovals = (
  contract: FinanceEngagementContract,
  reasons: string[],
): void => {
  const approvals = contract.approvals;
  for (const [label, value] of Object.entries(approvals)) {
    addReasonIf(
      reasons,
      !hasConcreteText(value),
      `approval field ${label} is unresolved`,
    );
  }
  addReasonIf(
    reasons,
    !isIsoTimestamp(approvals.clientApprovedAt) ||
      !isIsoTimestamp(approvals.mhooAcceptedAt),
    'client and Mhoo approval timestamps must be ISO timestamps',
  );
};

export const evaluateGate0 = (
  contract: FinanceEngagementContract,
): Gate0Decision => {
  const reasons: string[] = [];
  addReasonIf(
    reasons,
    contract.schemaVersion !== CONTRACT_SCHEMA_VERSION,
    'unsupported contract schema version',
  );
  addReasonIf(reasons, contract.status !== 'APPROVED', 'contract is not APPROVED');
  addReasonIf(reasons, !hasConcreteText(contract.contractId), 'contract ID is unresolved');
  addReasonIf(reasons, contract.revision < 1, 'contract revision must be positive');
  addReasonIf(reasons, !hasSha256(contract.contentSha256), 'contract content hash is invalid');
  addReasonIf(
    reasons,
    contract.linear.executionIssue !== LINEAR_EXECUTION_ISSUE ||
      !contract.linear.isExecutionView,
    'Linear binding must remain the MHO-123 execution view only',
  );
  addReasonIf(
    reasons,
    contract.authority.canonicalRepository !== 'mhoo-os/mhoo' ||
      contract.authority.implementationRepository !== 'mhoo-os/mhoo-twenty-next' ||
      contract.authority.acceptedArchitecture !== 'ADR-0008' ||
      contract.authority.financeProposal !== 'ADR-0009' ||
      contract.authority.financeProposalStatus !== 'PROPOSED' ||
      !contract.authority.twentySoleWorkspaceAuthority,
    'authority bindings are not the governed Mhoo/next/ADR-0008 boundary',
  );
  addReasonIf(
    reasons,
    contract.legal.packetReference !== 'MHOO-LEGAL-2026-v2.0' ||
      !hasSha256(contract.legal.manifestSha256) ||
      !contract.legal.dpaStatus,
    'legal packet reference, manifest, and DPA state are required',
  );
  const engagement = contract.engagement;
  addReasonIf(
    reasons,
    !hasConcreteText(engagement.clientLegalEntity) ||
      !hasConcreteText(engagement.jurisdiction) ||
      engagement.authorizedRepresentatives.length === 0 ||
      engagement.authorizedRepresentatives.some((value) => !hasConcreteText(value)) ||
      !hasConcreteText(engagement.representativeAuthorityBasis) ||
      !hasConcreteText(engagement.timezone) ||
      !hasConcreteText(engagement.operatingYearDefinition) ||
      !hasConcreteText(engagement.monthCloseRule) ||
      engagement.yearStartMonth < 1 ||
      engagement.yearStartMonth > 12,
    'client, representative, timezone, year, and month-close scope is unresolved',
  );
  hasSixContiguousPeriods(contract, reasons);
  const clover = contract.cloverScope;
  addReasonIf(reasons, clover.status === undefined, 'Clover scope status is unresolved');
  addReasonIf(
    reasons,
    clover.status === 'IN_SCOPE' &&
      (clover.merchantReferences.length === 0 || clover.locationReferences.length === 0),
    'in-scope Clover work requires merchant and location references',
  );
  addReasonIf(
    reasons,
    !hasConcreteText(clover.employeeShiftScope),
    'Clover employee/shift scope must be explicit',
  );
  hasRequiredInventoryShape(contract, reasons);
  hasReviewAndReportBoundary(contract, reasons);
  hasLifecycleBoundary(contract, reasons);
  hasApprovals(contract, reasons);
  addReasonIf(
    reasons,
    Object.values(contract.nonAuthorizations).some((value) => value !== false),
    'live effects must remain explicitly unapproved',
  );

  return new Gate0Decision(DECISION_SEAL, {
    gate0Approved: reasons.length === 0,
    reasons,
    mayPrepareSyntheticFixtures: true,
    mayAcquireBusinessSourceData: false,
    mayAccessPersonalAccountData: false,
    mayUseCredentials: false,
    mayImport: false,
    mayDeploy: false,
    mayActivateProduction: false,
  });
};

export const evaluateSourceAcquisition = (
  contract: FinanceEngagementContract,
  form: SourceAcquisitionForm,
): SourceAcquisitionDecision => {
  const gate = evaluateGate0(contract);
  const reasons = [...gate.reasons];
  const item = contract.inventory.items.find(
    (candidate) => candidate.inventoryId === form.inventoryItemId,
  );
  addReasonIf(reasons, form.status !== 'APPROVED', 'source form is not APPROVED');
  addReasonIf(reasons, form.contractId !== contract.contractId, 'source form contract mismatch');
  addReasonIf(reasons, !item, 'source form item is not in the approved inventory');
  addReasonIf(reasons, item?.sensitivity !== 'BUSINESS', 'source form is not business-only');
  addReasonIf(reasons, !form.businessOnly, 'source form must be business-only');
  addReasonIf(reasons, form.personalDataIncluded, 'source form includes personal data');
  addReasonIf(reasons, !form.readOnly, 'source form must be read-only');
  addReasonIf(reasons, form.credentialValuesPresent, 'credential values are prohibited');
  addReasonIf(
    reasons,
    !form.excludedDataClasses.includes('OWNER_OR_PERSONAL_ACCOUNT') ||
      !form.excludedDataClasses.includes('UNRELATED_RECORDS'),
    'source form must exclude personal and unrelated records',
  );
  addReasonIf(reasons, form.allowedDataClasses.length === 0, 'allowed data classes are empty');
  addReasonIf(
    reasons,
    !isInside(form.period, {
      startDate: contract.engagement.inclusiveStartDate,
      endDate: contract.engagement.inclusiveEndDate,
      timezone: contract.engagement.timezone,
    }),
    'source form period is outside the approved engagement range',
  );
  for (const [label, value] of Object.entries(form)) {
    if (typeof value === 'string' && ['status', 'contractId'].includes(label)) {
      continue;
    }
    if (typeof value === 'string') {
      addReasonIf(reasons, !hasConcreteText(value), `source form field ${label} is unresolved`);
    }
  }
  addReasonIf(
    reasons,
    !isIsoTimestamp(form.approvedAt),
    'source form approval timestamp is invalid',
  );
  addReasonIf(
    reasons,
    contract.legal.dpaStatus !== 'EXECUTED_APPROVED',
    'live source acquisition is blocked until the DPA is executed and approved',
  );

  const authorized = reasons.length === 0;
  return new SourceAcquisitionDecision(DECISION_SEAL, {
    authorized,
    reasons,
    mayReceiveBusinessSourceData: authorized,
    mayAccessPersonalAccountData: false,
    mayUseCredentials: false,
    mayImport: false,
    mayDeploy: false,
    mayActivateProduction: false,
  });
};

export const evaluatePersonalDataAccess = (
  contract: FinanceEngagementContract,
  form: PersonalDataAuthorization,
): PersonalDataDecision => {
  const gate = evaluateGate0(contract);
  const reasons = [...gate.reasons];
  addReasonIf(
    reasons,
    contract.authorizations.personalDataStatus !== 'APPROVED_BY_AMENDMENT',
    'personal data requires an approved separate amendment',
  );
  addReasonIf(reasons, form.status !== 'APPROVED', 'personal-data form is not APPROVED');
  for (const [label, value] of Object.entries(form)) {
    if (label === 'status') {
      continue;
    }
    if (typeof value === 'string') {
      addReasonIf(reasons, !hasConcreteText(value), `personal-data field ${label} is unresolved`);
    }
  }
  addReasonIf(reasons, form.permittedRecipients.length === 0, 'personal recipients are unresolved');
  addReasonIf(
    reasons,
    !isInside(form.period, {
      startDate: contract.engagement.inclusiveStartDate,
      endDate: contract.engagement.inclusiveEndDate,
      timezone: contract.engagement.timezone,
    }),
    'personal-data case period is outside the approved engagement range',
  );
  addReasonIf(
    reasons,
    !isIsoTimestamp(form.approvedAt),
    'personal-data approval timestamp is invalid',
  );
  const authorized = reasons.length === 0;
  return new PersonalDataDecision(DECISION_SEAL, {
    authorized,
    reasons,
    mayAccessPersonalAccountData: authorized,
    mayUseCredentials: false,
    mayImport: authorized,
    mayExportUnmasked: false,
    mayDeploy: false,
    mayActivateProduction: false,
  });
};

export const evaluateFirstTrancheAuthorization = (
  contract: FinanceEngagementContract,
  form: FirstTrancheAuthorizationForm,
): FirstTrancheDecision => {
  const gate = evaluateGate0(contract);
  const reasons = [...gate.reasons];
  const item = contract.inventory.items.find(
    (candidate) => candidate.inventoryId === form.source.inventoryItemId,
  );
  addReasonIf(reasons, form.status !== 'APPROVED', 'first-tranche form is not APPROVED');
  addReasonIf(
    reasons,
    form.engagementContractId !== contract.contractId,
    'first-tranche contract mismatch',
  );
  addReasonIf(
    reasons,
    !item,
    'first-tranche item is not in the approved inventory',
  );
  addReasonIf(reasons, item?.sensitivity !== 'BUSINESS', 'first tranche must be business-only');
  addReasonIf(reasons, !form.source.businessOnly, 'first tranche must be business-only');
  addReasonIf(reasons, form.source.personalDataIncluded, 'first tranche includes personal data');
  addReasonIf(reasons, form.source.credentialValuesInForm, 'credential values are prohibited');
  addReasonIf(
    reasons,
    !form.source.excludedDataClasses.includes('OWNER_OR_PERSONAL_ACCOUNT') ||
      !form.source.excludedDataClasses.includes('UNRELATED_RECORDS'),
    'first tranche must exclude personal and unrelated records',
  );
  addReasonIf(
    reasons,
    form.source.allowedDataClasses.length === 0,
    'first-tranche data classes are empty',
  );
  addReasonIf(
    reasons,
    !isInside(
      {
        startDate: form.source.exactStartDate,
        endDate: form.source.exactEndDate,
        timezone: form.source.timezone,
      },
      {
        startDate: contract.engagement.inclusiveStartDate,
        endDate: contract.engagement.inclusiveEndDate,
        timezone: contract.engagement.timezone,
      },
    ),
    'first-tranche period is outside the approved engagement range',
  );
  for (const value of [
    form.acceptanceReceiptReference,
    form.legalAndLifecycleReceiptReference,
    form.runtimeGateReceiptReference,
    form.emptyWorkspaceReceiptReference,
    form.workspaceRoleBindingReceiptReference,
    form.source.sourceType,
    form.source.maskedSourceReference,
    form.source.deliveryMethod,
    form.source.credentialOwnerReference,
    form.controls.parserOrImporterVersion,
    form.controls.custodyManifestPlan,
    form.controls.operatorReference,
    form.controls.reviewerReference,
    form.controls.rollbackOrDeletionPlan,
    form.controls.sourceLimitAndFailurePath,
    form.approval.authorizedBy,
    form.approval.authorizationReference,
  ]) {
    addReasonIf(reasons, !hasConcreteText(value), 'first-tranche required receipt or control is unresolved');
  }
  addReasonIf(
    reasons,
    !form.controls.explicitPartialStatement.toLowerCase().includes('partial') ||
      !form.controls.explicitPartialStatement
        .toLowerCase()
        .includes('does not prove six-year completeness'),
    'first tranche must state that it is partial and does not prove six-year completeness',
  );
  addReasonIf(
    reasons,
    !isIsoTimestamp(form.approval.authorizedAt),
    'first-tranche approval timestamp is invalid',
  );
  addReasonIf(
    reasons,
    !form.controls.noProductionActivation,
    'first-tranche form must prohibit production activation',
  );
  const authorized = reasons.length === 0;
  return new FirstTrancheDecision(DECISION_SEAL, {
    authorized,
    reasons,
    mayReceiveBusinessSourceData: authorized,
    mayImportBusinessData: authorized,
    mayAccessPersonalAccountData: false,
    mayUseCredentials: false,
    mayDeploy: false,
    mayActivateProduction: false,
  });
};

export const evaluateProvenComplete = (
  receipt: ProvenCompleteReceipt,
): ProvenCompleteDecision => {
  const fields = Object.entries(receipt).filter(([, value]) => value !== true);
  return new ProvenCompleteDecision(DECISION_SEAL, {
    provenComplete: fields.length === 0,
    reasons: fields.map(([field]) => `${field} is not proven`),
  });
};

export const isProvenComplete = (receipt: ProvenCompleteReceipt): boolean =>
  evaluateProvenComplete(receipt).provenComplete;
