import { fireEvent, render, screen } from "@testing-library/react";
import { authClient } from "@/lib/auth-client";
import { GameClientAuthBoundary } from "./game-client-auth-boundary";

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({
    data: null,
    isPending: false,
  }),
}));

vi.mock("@/lib/api/generated/auth/auth/auth", () => ({
  getAuthControllerGetScopesQueryKey: () => ["auth-scopes"],
  useAuthControllerGetScopes: () => ({
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
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

describe("GameClientAuthBoundary", () => {
  it("blocks the client until the user reconnects manually", () => {
    render(
      <GameClientAuthBoundary>
        <div>authenticated-client</div>
      </GameClientAuthBoundary>,
    );

    expect(screen.queryByText("authenticated-client")).toBeNull();

    fireEvent.click(screen.getByText("common.auth.reconnect"));

    expect(authClient.signIn.social).toHaveBeenCalledTimes(1);
  });
});
