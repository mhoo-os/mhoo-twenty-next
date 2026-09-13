import { createRoot } from 'react-dom/client';
import { PaymentStatus } from '../src/operator/PaymentStatus';
import { merchants, readSyntheticStatus } from './fixtures';
// Native worker module ABI. SDK build plugins translate JSX and inject CSS.
// A function export is not an installable App definition.
export default function render(container: HTMLElement) {
  createRoot(container).render(<PaymentStatus merchants={merchants} readStatus={readSyntheticStatus} />);
}
