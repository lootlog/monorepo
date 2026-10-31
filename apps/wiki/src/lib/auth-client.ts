import { createAuthClient } from "better-auth/react";

export const createWikiAuthClient = (authServiceUrl: string) =>
  createAuthClient({ baseURL: `${authServiceUrl}/idp` });

export type WikiAuthClient = ReturnType<typeof createWikiAuthClient>;
