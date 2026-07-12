// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api-client/api-client";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationGuard } from "./authentication-guard";

const refetch = vi.fn();

vi.mock("@/hooks/api/use-auth-scopes", () => ({
  useAuthScopes: () => ({
    data: undefined,
    error: new ApiError({
      status: 401,
      data: {
        error: "TOKEN_REFRESH_FAILED",
        requiresReauth: true,
      },
      method: "GET",
      url: "https://auth.example.com/auth/@me/scopes",
      message: "TOKEN_REFRESH_FAILED",
    }),
    isError: true,
    isFetched: true,
    isPending: false,
    refetch,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("AuthenticationGuard", () => {
  it("blocks protected content and waits for a manual reconnect", () => {
    render(
      <AuthenticationGuard>
        <div>protected-content</div>
      </AuthenticationGuard>,
    );

    expect(screen.queryByText("protected-content")).toBeNull();

    fireEvent.click(screen.getByText("auth.reloginRequired.button"));

    expect(authClient.signIn.social).toHaveBeenCalledTimes(1);
  });
});
