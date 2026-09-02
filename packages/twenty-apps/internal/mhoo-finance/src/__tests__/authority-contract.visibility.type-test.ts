import { evaluateGate0 } from '../engagement/authority-contract';

type Gate0Result = ReturnType<typeof evaluateGate0>;

// @ts-expect-error A decision returned by the evaluator cannot be forged as a literal.
const forgedGate0Decision: Gate0Result = {
  gate0Approved: true,
  reasons: [],
  mayPrepareSyntheticFixtures: true,
  mayAcquireBusinessSourceData: false,
  mayAccessPersonalAccountData: false,
  mayUseCredentials: false,
  mayImport: false,
  mayDeploy: false,
  mayActivateProduction: false,
};

void forgedGate0Decision;
