// @vitest-environment happy-dom

import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { releaseStartupScreenOnFirstResolve } from "./startup-screen";

const waitForExit = () => new Promise((resolve) => setTimeout(resolve, 300));

const showStartupScreen = () => {
  const screen = document.createElement("div");

  screen.id = "startup-screen";
  screen.append(document.createElement("div"));
  document.body.append(screen);

  return screen;
};

const createAppRouter = (beforeLoad: () => Promise<void>) =>
  createRouter({
    routeTree: createRootRoute({ beforeLoad }),
    history: createMemoryHistory(),
  });

describe("startup screen", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("covers the app until its first navigation resolves", async () => {
    const screen = showStartupScreen();
    let finishLoading = () => {};

    const router = createAppRouter(
      () => new Promise((resolve) => (finishLoading = resolve)),
    );

    releaseStartupScreenOnFirstResolve(router);

    const navigation = router.load();

    await waitForExit();
    expect(screen.isConnected).toBe(true);

    finishLoading();
    await navigation;
    await waitForExit();

    expect(screen.isConnected).toBe(false);
  });

  it("gets out of the way of a failed first navigation", async () => {
    const screen = showStartupScreen();

    const router = createAppRouter(() =>
      Promise.reject(new Error("session unavailable")),
    );

    releaseStartupScreenOnFirstResolve(router);
    await router.load();
    await waitForExit();

    expect(screen.isConnected).toBe(false);
  });
});
