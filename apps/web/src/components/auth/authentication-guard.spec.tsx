// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  configureApiClients,
  type ApiServiceConfig,
} from "@lootlog/client/transport";
import { getAuthControllerGetScopesQueryKey } from "@lootlog/client/auth";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";

await initializeTestTranslations();

const signInFetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>();

vi.stubGlobal("fetch", signInFetch);

const { AuthenticationGuard } = await import("./authentication-guard");

const renderGuard = (
  scopes: readonly string[] | null = DISCORD_AUTH_SCOPES,
  fetchScopes?: ApiServiceConfig["fetch"],
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });

  onTestFinished(() => queryClient.clear());

  const restore = configureApiClients({
    auth: { baseUrl: "https://auth.test", fetch: fetchScopes },
  });

  onTestFinished(restore);

  if (scopes)
    queryClient.setQueryData(getAuthControllerGetScopesQueryKey(), [...scopes]);

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthenticationGuard>
        <span>protected content</span>
      </AuthenticationGuard>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  useAuthRecoveryStore.getState().clearFailure();
  signInFetch.mockReset();
  signInFetch.mockImplementation(() => new Promise<Response>(() => undefined));
  vi.stubGlobal("fetch", signInFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AuthenticationGuard", () => {
  it("renders protected content only when all scopes are available", () => {
    renderGuard();
    expect(screen.getByText("protected content")).toBeTruthy();
  });

  it("starts exactly one OAuth request after an explicit click", async () => {
    renderGuard([]);

    const loginButton = screen.getByRole("button", {
      name: "auth.reloginRequired.button",
    });

    fireEvent.click(loginButton);
    fireEvent.click(loginButton);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    expect(loginButton.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("allows an explicit retry only after OAuth initiation fails", async () => {
    signInFetch.mockRejectedValueOnce(new Error("connection failed"));
    renderGuard([]);

    const loginButton = screen.getByRole("button", {
      name: "auth.reloginRequired.button",
    });

    fireEvent.click(loginButton);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(loginButton.hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(loginButton);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(2));
  });

  it("shows recorded callback recovery without starting OAuth", () => {
    useAuthRecoveryStore
      .getState()
      .requireRecovery({ requiresReauth: false, status: 401 });
    renderGuard();
    expect(
      screen.getByRole("button", { name: "auth.reloginRequired.button" }),
    ).toBeTruthy();
    expect(signInFetch).not.toHaveBeenCalled();
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("offers a request retry for a non-authentication failure", async () => {
    const fetchScopes = vi.fn(() =>
      Promise.resolve(
        Response.json({ message: "unavailable" }, { status: 503 }),
      ),
    );

    renderGuard(null, fetchScopes);

    const retry = await screen.findByRole("button", {
      name: "auth.unavailable.button",
    });

    fireEvent.click(retry);
    await waitFor(() => expect(fetchScopes).toHaveBeenCalledTimes(2));
    expect(signInFetch).not.toHaveBeenCalled();
  });
});
