import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RecentImport } from '../operator/RecentImport';
import { PaymentStatus } from '../operator/PaymentStatus';

it('renders the portable status shell without a native host or import callback', () => {
  const html = renderToStaticMarkup(createElement(PaymentStatus, { merchants: [], readStatus: async () => ({ kind: 'available', pages: [], hasMore: false }) }));
  expect(html).toContain('Choose a merchant');
  expect(html).not.toContain('Start with a small sample');
});
it('renders the same shared import control with an injected transport and no Twenty client', () => {
  const request = vi.fn(async () => ({ kind: 'receipts', pages: [], hasMore: false }));
  const html = renderToStaticMarkup(createElement(RecentImport, { connectionId: '11111111-1111-4111-8111-111111111111', request, onSaved: () => {} }));
  expect(html).toContain('Verify merchant'); expect(html).toContain('Up to 100 payments');
  expect(html).toContain('Your recent imports'); expect(request).not.toHaveBeenCalled();
});
