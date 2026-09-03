// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignIn } from "./signin";

const mocks = vi.hoisted(() => ({
  search: {
    error: "state_security_mismatch" as string | undefined,
    redirect: "/@me" as string | undefined,
  },
  signInSocial: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mocks.search,
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

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
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

describe("SignIn OAuth recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.error = "state_security_mismatch";
    mocks.search.redirect = "/@me";
    mocks.signInSocial.mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a callback failure without automatically restarting OAuth", () => {
    render(<SignIn />);

    expect(screen.getByText("auth.signin.callbackFailed")).toBeTruthy();
    expect(mocks.signInSocial).not.toHaveBeenCalled();
  });

  it("starts one OAuth flow after an explicit retry", () => {
    render(<SignIn />);

    const button = screen.getByRole("button", { name: "auth.signin.submit" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mocks.signInSocial).toHaveBeenCalledTimes(1);
    expect(mocks.signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: `${window.location.origin}/@me`,
        errorCallbackURL: window.location.href,
        provider: "discord",
      }),
    );
  });
});
