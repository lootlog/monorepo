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
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInFetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>();

const authFetch: NonNullable<ApiServiceConfig["fetch"]> = (input, init) => {
  if (String(input).includes("/get-session"))
    return Promise.resolve(Response.json(null));

  return signInFetch(input, init);
};

vi.stubGlobal("fetch", authFetch);

const { SignInError } = await import("./sign-in-error");

const { Route } = await import("../../routes/signin_.error");

await initializeTestTranslations();

const renderSignInError = async (search: Record<string, string>) => {
  const root = createRootRoute();

  const unnestedSignin = createRoute({
    getParentRoute: () => root,
    id: "signin_",
  });

  const signInError = createRoute({
    getParentRoute: () => unnestedSignin,
    path: "error",
    component: SignInError,
    validateSearch: Route.options.validateSearch,
  });

  const router = createRouter({
    routeTree: root.addChildren([unnestedSignin.addChildren([signInError])]),
    history: createMemoryHistory({
      initialEntries: [`/error?${new URLSearchParams(search)}`],
    }),
  });

  await router.load();

  return render(<RouterProvider router={router} />);
};

const retryButton = () =>
  screen.getByRole("button", { name: "auth.signinError.retry" });

const decodeStartedSignIn = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      callbackURL: Schema.String,
      errorCallbackURL: Schema.String,
    }),
  ),
);

const startedSignIn = () =>
  decodeStartedSignIn(String(signInFetch.mock.calls[0]?.[1]?.body));

beforeEach(() => {
  signInFetch.mockReset();
  signInFetch.mockImplementation(() => new Promise<Response>(() => undefined));
  vi.stubGlobal("fetch", authFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SignInError", () => {
  it("explains a Discord account without an email instead of a generic failure", async () => {
    await renderSignInError({ error: "email_not_found" });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "auth.signinError.kinds.emailMissing.title",
    );
    expect(signInFetch).not.toHaveBeenCalled();
  });

  it.each(["unable_to_create_user", "constructor"])(
    "shows the generic failure with the reportable code %s",
    async (error) => {
      await renderSignInError({ error });

      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "auth.signinError.kinds.unknown.title",
      );
      expect(screen.getByText(error).tagName).toBe("CODE");
    },
  );

  it("offers no retry to a banned account", async () => {
    await renderSignInError({ error: "BANNED_USER" });

    expect(
      screen.queryByRole("button", { name: "auth.signinError.retry" }),
    ).toBeNull();
  });

  it("retries once and returns to the Lootlog site where sign-in started", async () => {
    const retry = "https://wiki.lootlog.pl/items/sword?tab=drops";
    await renderSignInError({ error: "access_denied", retry });

    fireEvent.click(retryButton());
    fireEvent.click(retryButton());

    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    expect(startedSignIn()).toMatchObject({
      callbackURL: retry,
      errorCallbackURL: `${window.location.origin}/signin/error?retry=${encodeURIComponent(retry)}`,
    });
  });

  it.each([
    "https://evil.example/",
    "https://lootlog.pl.evil.example/",
    "http://wiki.lootlog.pl/",
    "javascript:alert(1)",
  ])("never returns to the untrusted retry %j", async (retry) => {
    await renderSignInError({ error: "state_mismatch", retry });

    fireEvent.click(retryButton());

    await waitFor(() => expect(signInFetch).toHaveBeenCalledTimes(1));
    expect(startedSignIn()).toMatchObject({
      callbackURL: `${window.location.origin}/signin`,
    });
  });
});
