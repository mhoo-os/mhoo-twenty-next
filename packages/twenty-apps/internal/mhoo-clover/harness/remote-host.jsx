import { createRoot } from 'react-dom/client';
import { FrontComponentRenderer } from '../../../../twenty-front-component-renderer/src/host/components/FrontComponentRenderer';
const deny = async () => { throw new Error('Host operation outside synthetic renderer proof'); };
const api = new Proxy({}, { get: () => deny });
createRoot(document.getElementById('root')).render(<>
  <p>mhoo · actual Twenty Remote DOM / synthetic fixture</p>
  <FrontComponentRenderer componentUrl={location.origin + '/remote-component.mjs'}
    executionContext={{ frontComponentId: 'clover-local-renderer', userId: null, recordId: null, selectedRecordIds: [], timelineActivityId: null, colorScheme: 'light' }}
    frontComponentHostCommunicationApi={api} colorScheme="light"
    onError={(error) => { document.getElementById('error').textContent = error?.message ?? 'Renderer error'; }} />
  <p>No Workspace installed. Native authentication and permission checks remain unproved.</p>
</>);
