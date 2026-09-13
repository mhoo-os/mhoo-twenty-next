import { defineLogicFunction } from 'twenty-sdk/define';
import { PAYMENT_HISTORY_FUNCTION } from '../contracts/model-identifiers';
import {
  startCloverPaymentHistory,
  type HistoryInput,
} from './plan-clover-payment-history';
import { cloverOperatorRuntime } from './clover-operator-runtime';

export default defineLogicFunction({
  universalIdentifier: PAYMENT_HISTORY_FUNCTION,
  name: 'clover-payment-history',
  description:
    'Explicit Workspace operator dispatch under an existing native Clover connection grant. Coverage remains unverified.',
  timeoutSeconds: 20,
  handler: async (input: HistoryInput, context) =>
    startCloverPaymentHistory(input, cloverOperatorRuntime(context)),
});
