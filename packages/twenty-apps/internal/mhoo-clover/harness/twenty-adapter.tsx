import { defineSettingsFrontComponent } from 'twenty-sdk/define';
import { PaymentStatus } from '../src/operator/PaymentStatus';
import { merchants, readSyntheticStatus } from './fixtures';
// Named harness-only definition: excluded by native default-export discovery.
export const TwentyStatusHarness = () => <PaymentStatus merchants={merchants} readStatus={readSyntheticStatus} />;
export const twentyDefinition = defineSettingsFrontComponent({
  universalIdentifier: '640b038f-291f-463c-ac23-5f6299ae0fad',
  name: 'Clover synthetic status trial',
  component: TwentyStatusHarness,
});
export const sharedComponent = PaymentStatus;
