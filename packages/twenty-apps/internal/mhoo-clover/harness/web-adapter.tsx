import { PaymentStatus } from '../src/operator/PaymentStatus';
import { merchants, readSyntheticStatus } from './fixtures';
export const WebStatusHarness = () => <PaymentStatus merchants={merchants} readStatus={readSyntheticStatus} />;
export const sharedComponent = PaymentStatus;
