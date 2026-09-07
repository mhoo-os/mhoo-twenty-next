import { defineLogicFunction } from 'twenty-sdk/define';
import { PAYMENT_RECOVERY_FUNCTION } from '../contracts/model-identifiers';
import {
  recoverCloverPaymentReceipt,
  type RecoveryInput,
} from './plan-clover-payment-history';
import { cloverOperatorRuntime } from './clover-operator-runtime';

export default defineLogicFunction({
  universalIdentifier: PAYMENT_RECOVERY_FUNCTION,
  name: 'clover-payment-recover',
  description:
    'Explicit Workspace operator dispatch under an existing native Clover connection grant. Coverage remains unverified.',
  timeoutSeconds: 20,
  handler: async (input: RecoveryInput, context) =>
    recoverCloverPaymentReceipt(input, cloverOperatorRuntime(context)),
});
