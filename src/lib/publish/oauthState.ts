/** Pure CSRF helpers for OAuth callbacks (unit-tested). */

export function oauthStatesMatch(
  cookieState: string | undefined,
  queryState: string | null,
): boolean {
  return Boolean(cookieState && queryState && cookieState === queryState);
}
