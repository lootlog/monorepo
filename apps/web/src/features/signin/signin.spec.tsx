// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ApiServiceConfig } from "@lootlog/client/transport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInFetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>();

vi.stubGlobal("fetch", signInFetch);

const { SignIn } = await import("./signin");

const { Route } = await import("../../routes/signin");

await initializeTestTranslations();

const renderSignIn = async () => {
  const root = createRootRoute();

  const signin = createRoute({
    getParentRoute: () => root,
    path: "signin",
    component: SignIn,
    validateSearch: Route.options.validateSearch,
  });

  const router = createRouter({
    routeTree: root.addChildren([signin]),
    history: createMemoryHistory({
      initialEntries: [
        "/signin?error=state_security_mismatch&redirect=%2F%40me",
      ],
    }),
  });

  await router.load();

  return render(<RouterProvider router={router} />);
};

beforeEach(() => {
  signInFetch.mockReset();
  signInFetch.mockImplementation(() => new Promise<Response>(() => undefined));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SignIn OAuth recovery", () => {
  it("shows a callback failure without automatically restarting OAuth", async () => {
    await renderSignIn();
    expect(screen.getByText("auth.signin.callbackFailed")).toBeTruthy();
    expect(signInFetch).not.toHaveBeenCalled();
  });

  it("starts one OAuth flow after an explicit retry", async () => {
    await renderSignIn();
    const button = screen.getByRole("button", { name: "auth.signin.submit" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(String(signInFetch.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      callbackURL: `${window.location.origin}/@me`,
      errorCallbackURL: window.location.href,
      provider: "discord",
    });
  });
});
