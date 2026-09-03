// @vitest-environment happy-dom

import { ApiError } from "@lootlog/client/transport";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { AuthenticationGuard } from "./authentication-guard";

const mocks = vi.hoisted(() => ({
  query: {
    data: [] as string[] | undefined,
    error: null as unknown,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
  signInSocial: vi.fn(),
}));

vi.mock("@/hooks/api/use-auth-scopes", () => ({
  useAuthScopes: () => mocks.query,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: mocks.signInSocial,
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@lootlog/ui/components/button", () => ({
  Button: ({
    children,
    size: _size,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { size?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@lootlog/ui/components/card", () => ({
  Card: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  LoaderCircle: (props: HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
  ShieldAlert: (props: HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
}));

const renderGuard = (children: ReactNode = <span>protected content</span>) =>
  render(<AuthenticationGuard>{children}</AuthenticationGuard>);

describe("AuthenticationGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthRecoveryStore.getState().clearFailure();
    mocks.query.data = [...DISCORD_AUTH_SCOPES];
    mocks.query.error = null;
    mocks.query.isError = false;
    mocks.query.isPending = false;
    mocks.signInSocial.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders protected content only when all scopes are available", () => {
    renderGuard();

    expect(screen.getByText("protected content")).toBeTruthy();
  });

  it("starts exactly one OAuth flow after an explicit click", () => {
    mocks.query.data = [];
    mocks.signInSocial.mockReturnValue(new Promise(() => undefined));
    renderGuard();

    const loginButton = screen.getByRole("button", {
      name: "auth.reloginRequired.button",
    });
    fireEvent.click(loginButton);
    fireEvent.click(loginButton);

    expect(mocks.signInSocial).toHaveBeenCalledTimes(1);
    expect((loginButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("allows an explicit retry only after OAuth initiation fails", async () => {
    mocks.query.data = [];
    mocks.signInSocial.mockRejectedValueOnce(new Error("state mismatch"));
    renderGuard();

    const loginButton = screen.getByRole("button", {
      name: "auth.reloginRequired.button",
    });
    fireEvent.click(loginButton);

    await waitFor(() =>
      expect((loginButton as HTMLButtonElement).disabled).toBe(false),
    );
    expect(mocks.signInSocial).toHaveBeenCalledTimes(1);

    mocks.signInSocial.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.click(loginButton);
    expect(mocks.signInSocial).toHaveBeenCalledTimes(2);
  });

  it("shows reauthentication recovery for a recorded callback failure without starting OAuth", () => {
    useAuthRecoveryStore.getState().requireRecovery({
      requiresReauth: false,
      status: 401,
    });
    renderGuard();

    expect(
      screen.getByRole("button", { name: "auth.reloginRequired.button" }),
    ).toBeTruthy();
    expect(mocks.signInSocial).not.toHaveBeenCalled();
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("offers a request retry for a non-authentication failure", () => {
    mocks.query.data = undefined;
    mocks.query.isError = true;
    mocks.query.error = new ApiError({
      message: "unavailable",
      method: "GET",
      status: 503,
      url: "/auth/scopes",
    });
    renderGuard();

    fireEvent.click(
      screen.getByRole("button", { name: "auth.unavailable.button" }),
    );

    expect(mocks.query.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.signInSocial).not.toHaveBeenCalled();
  });
});
