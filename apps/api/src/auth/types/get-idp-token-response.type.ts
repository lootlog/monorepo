import type { AuthErrorResponse } from "@lootlog/types";

export type GetIdpTokenResponse =
  | {
      accessToken: string;
      expiresIn: number;
      scopes: string[];
    }
  | AuthErrorResponse;
