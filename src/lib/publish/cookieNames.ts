const COOKIE_PREFIX = "sonara_pub_";

export const publishCookies = {
  scState: `${COOKIE_PREFIX}sc_state`,
  scVerifier: `${COOKIE_PREFIX}sc_verifier`,
  ytState: `${COOKIE_PREFIX}yt_state`,
} as const;

export type CookieOpts = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: string;
  maxAge: number;
};

export function oauthCookieOptions(): CookieOpts {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  };
}
