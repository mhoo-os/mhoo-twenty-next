import { createRoot } from 'react-dom/client';
import { twentyDefinition, TwentyStatusHarness, sharedComponent as twentyShared } from './twenty-adapter';
import { WebStatusHarness, sharedComponent as webShared } from './web-adapter';
const host = new URLSearchParams(location.search).get('host') === 'twenty' ? 'twenty' : 'web';
if (!twentyDefinition.success || twentyShared !== webShared || twentyDefinition.config.component !== TwentyStatusHarness) throw new Error('Shared component identity mismatch');
const Host = host === 'twenty' ? twentyDefinition.config.component : WebStatusHarness;
createRoot(document.getElementById('root')!).render(<><aside className="mhoo-trial-banner"><strong>mhoo</strong><span>{host === 'twenty' ? 'Twenty definition harness' : 'Local web shell'} · synthetic / read-only</span></aside><Host /><aside className="mhoo-trial-note">Browser harness only. Native sandbox, permissions and installed invocation are not proved here.</aside></>);
