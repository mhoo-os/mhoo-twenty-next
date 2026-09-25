export type NativeReadErrorCode =
  | 'invalid_tool_input'
  | 'unknown_tool'
  | 'clover_origin_rejected'
  | 'clover_redirect_rejected'
  | 'clover_provider_timeout'
  | 'clover_provider_unavailable'
  | 'clover_provider_http_error'
  | 'clover_response_too_large'
  | 'clover_response_invalid';

export class CloverNativeReadError extends Error {
  readonly code: NativeReadErrorCode;
  readonly providerStatus?: number;

  constructor(code: NativeReadErrorCode, providerStatus?: number) {
    super(code);
    this.name = 'CloverNativeReadError';
    this.code = code;
    this.providerStatus = providerStatus;
  }
}
