/**
 * Pure helpers for OAuth redirect validation (unit-tested without Next.js request mocks).
 */

/** True when provider redirected back with `code` and `state` query params (before CSRF validation). */
export function oauthCallbackHasAuthorizationParams(
  code: string | null | undefined,
  state: string | null | undefined,
): boolean {
  return Boolean(code?.trim() && state?.trim());
}
