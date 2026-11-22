export const signinRedirectPath = (redirect: string | undefined) =>
  redirect !== undefined && /^\/(?![/\\])[^\s\\]*$/u.test(redirect)
    ? redirect
    : undefined;
