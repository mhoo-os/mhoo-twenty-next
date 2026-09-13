import { RestApiClient } from 'twenty-client-sdk/rest';
import { useEffect, useState } from 'react';
import { defineSettingsFrontComponent } from 'twenty-sdk/define';
import { OPERATOR_SETTINGS_COMPONENT } from '../contracts/model-identifiers';
import { PaymentStatus } from '../operator/PaymentStatus';
import { listStatusMerchants, readNativeStatus } from '../operator/native-status-client';
import type { MerchantListResult } from '../operator/status-route-contract';
// Explicit delegated client; REST is bundled by the native component builder.
const client = new RestApiClient({ runAs: 'user' });
const readStatus = (id: string) => readNativeStatus(id, client);
export function CloverOperatorSettings() {
  const [result, setResult] = useState<MerchantListResult | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    listStatusMerchants(client).then((value) => { if (!cancelled) setResult(value); }).catch(() => { if (!cancelled) setResult({ kind: 'uncertain' }); });
    return () => { cancelled = true; };
  }, [revision]);
  if (result?.kind === 'available') return <PaymentStatus merchants={result.merchants} readStatus={readStatus} />;
  return <section className="mhoo-clover-status" role="status"><h1>Clover history</h1><p>{!result ? 'Loading connections…' : result.kind === 'denied' ? 'Access denied. Ask your Workspace administrator to review your permissions.' : 'Connections could not be confirmed. Try again.'}</p><button disabled={!result} onClick={() => setRevision((n) => n + 1)}>Refresh connections</button></section>;
}
export default defineSettingsFrontComponent({ universalIdentifier: OPERATOR_SETTINGS_COMPONENT, name: 'Clover payment status', component: CloverOperatorSettings });
