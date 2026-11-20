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

const sessionFetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>();

const authFetch: NonNullable<ApiServiceConfig["fetch"]> = (input, init) => {
  if (String(input).includes("/get-session")) return sessionFetch(input, init);

  return signInFetch(input, init);
};

vi.stubGlobal("fetch", authFetch);

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
  sessionFetch.mockReset();
  sessionFetch.mockImplementation(() => Promise.resolve(Response.json(null)));
  signInFetch.mockReset();
  signInFetch.mockImplementation(() => new Promise<Response>(() => undefined));
  vi.stubGlobal("fetch", authFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AuthenticationGuard", () => {
  it("requests additional Discord consent through account linking for an existing session", async () => {
    sessionFetch.mockResolvedValue(
      Response.json({
        session: { id: "existing-session", userId: "existing-user" },
        user: { id: "existing-user", discordId: "123456789012345671" },
      }),
    );
    renderGuard(["identify", "email"]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "auth.reloginRequired.button",
      }),
    );

    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    expect(String(signInFetch.mock.calls[0]?.[0])).toContain("/link-social");
    expect(
      JSON.parse(String(signInFetch.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      provider: "discord",
      scopes: DISCORD_AUTH_SCOPES,
      callbackURL: window.location.href,
    });
  });

  it("starts a new sign-in if the session expires before account linking", async () => {
    sessionFetch.mockResolvedValue(
      Response.json({
        session: { id: "expired-session", userId: "existing-user" },
        user: { id: "existing-user" },
      }),
    );
    signInFetch.mockResolvedValueOnce(
      Response.json(
        { code: "UNAUTHORIZED", message: "Session expired" },
        { status: 401 },
      ),
    );
    renderGuard([]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "auth.reloginRequired.button",
      }),
    );

    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(2));
    expect(String(signInFetch.mock.calls[0]?.[0])).toContain("/link-social");
    expect(String(signInFetch.mock.calls[1]?.[0])).toContain("/sign-in/social");
  });

  it("does not start OAuth when session verification is unavailable and allows retry", async () => {
    sessionFetch.mockResolvedValueOnce(
      Response.json(
        { code: "UNAVAILABLE", message: "Unavailable" },
        { status: 503 },
      ),
    );
    renderGuard([]);

    const button = screen.getByRole("button", {
      name: "auth.reloginRequired.button",
    });

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(signInFetch).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    expect(String(signInFetch.mock.calls[0]?.[0])).toContain("/sign-in/social");
  });

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
    expect(screen.getByRole("alert").textContent).toBe("auth.signin.failed");
    fireEvent.click(loginButton);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(2));
  });

  it.each([429, 503])(
    "shows an OAuth initiation error after HTTP %i and allows an explicit retry",
    async (status) => {
      signInFetch.mockResolvedValueOnce(
        Response.json(
          { code: "SIGN_IN_FAILED", message: "Internal authentication error" },
          { status },
        ),
      );
      renderGuard([]);

      const loginButton = screen.getByRole("button", {
        name: "auth.reloginRequired.button",
      });

      fireEvent.click(loginButton);
      await waitFor(() => {
        expect(screen.getByRole("alert").textContent).toBe(
          "auth.signin.failed",
        );
        expect(loginButton.hasAttribute("disabled")).toBe(false);
      });
      fireEvent.click(loginButton);
      await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(2));
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByText("protected content")).toBeNull();
    },
  );

  it("keeps OAuth pending after a successful response until navigation", async () => {
    signInFetch.mockResolvedValueOnce(
      Response.json({ url: "/oauth", redirect: false }),
    );
    renderGuard([]);

    const loginButton = screen.getByRole("button", {
      name: "auth.reloginRequired.button",
    });

    fireEvent.click(loginButton);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    fireEvent.click(loginButton);

    expect(loginButton.hasAttribute("disabled")).toBe(true);
    expect(signInFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
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
