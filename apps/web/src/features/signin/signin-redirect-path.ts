/**
 * Returns the sign-in redirect only when it is a root-relative path. The value
 * is appended to this origin for the OAuth callback, so "@host", "//host",
 * "/\host", or whitespace the URL parser strips would otherwise send the
 * player to another origin after signing in.
 */
export const signinRedirectPath = (redirect: string | undefined) =>
  redirect !== undefined && /^\/(?![/\\])[^\s\\]*$/u.test(redirect)
    ? redirect
    : undefined;
