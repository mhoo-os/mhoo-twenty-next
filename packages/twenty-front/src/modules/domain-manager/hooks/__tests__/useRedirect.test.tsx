import { act, renderHook } from '@testing-library/react';

import { useRedirect } from '@/domain-manager/hooks/useRedirect';

describe('useRedirect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.history.replaceState(null, '', '/welcome?locale=en');
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([undefined, '_self'])(
    'does not reload the current document for target %s',
    (target) => {
      const { result } = renderHook(() => useRedirect());

      act(() => {
        result.current.redirect(window.location.href, target);
        jest.runAllTimers();
      });

      expect(window.open).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/welcome?action=create-new-workspace',
    '/verify?loginToken=test-only',
    '/welcome?locale=fr',
    '/welcome?locale=en#next',
    'https://workspace.example.com/welcome?locale=en',
  ])('preserves navigation to %s', (url) => {
    const { result } = renderHook(() => useRedirect());

    act(() => {
      result.current.redirect(url);
      jest.runAllTimers();
    });

    expect(window.open).toHaveBeenCalledWith(url, '_self');
  });

  it.each(['_blank', 'named-window'])(
    'preserves the same URL in target %s',
    (target) => {
      const { result } = renderHook(() => useRedirect());

      act(() => {
        result.current.redirect(window.location.href, target);
        jest.runAllTimers();
      });

      expect(window.open).toHaveBeenCalledWith(window.location.href, target);
    },
  );
});
