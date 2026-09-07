import { createRoot } from 'react-dom/client';
import { FinanceQuestionPrototype } from '../src/components/finance-question-prototype';
// Actual native worker ABI; SDK plugins translate JSX and inject CSS.
// This local fixture is not an installable App definition.
export default function render(container: HTMLElement) {
  createRoot(container).render(<FinanceQuestionPrototype />);
}
