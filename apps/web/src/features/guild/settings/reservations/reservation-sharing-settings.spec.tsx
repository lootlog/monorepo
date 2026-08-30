// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationSharingSettings } from "./reservation-sharing-settings";

const mocks = vi.hoisted(() => ({
  createdInvitationResponse: {
    id: "invitation-1",
    invitePath: "/reservation-sharing/invitations/invitation-1",
    createdAt: "2026-08-26T00:00:00.000Z",
    expiresAt: "2026-09-02T00:00:00.000Z",
  } as Record<string, string>,
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@/hooks/context/use-guild-id", () => ({
  useGuildId: () => "guild-1",
}));

vi.mock("@/features/guild/reservations/get-reservation-error-message", () => ({
  getReservationErrorMessage: () => "Błąd",
}));

vi.mock("@lootlog/api-client/react-query/main/reservation-sharing", () => ({
  getListReservationSharesQueryKey: () => ["reservation-shares"],
  useListReservationShares: () => ({
    data: {
      shares: [],
      pendingInvitations: [
        {
          id: "invitation-1",
          createdAt: "2026-08-26T00:00:00.000Z",
          expiresAt: "2026-09-02T00:00:00.000Z",
        },
      ],
    },
    isPending: false,
    isError: false,
  }),
  useCreateReservationShareInvitation: ({ mutation }: any) => ({
    isPending: false,
    mutate: (variables: unknown) =>
      mutation.onSuccess?.(
        mocks.createdInvitationResponse,
        variables,
        undefined,
      ),
  }),
  useRevokeReservationShareInvitation: ({ mutation }: any) => ({
    isPending: false,
    mutate: (variables: unknown) =>
      mutation.onSuccess?.(undefined, variables, undefined),
  }),
  useRevokeReservationShare: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "settings.reservations.sharing.title": "Współdzielone rezerwacje",
        "settings.reservations.sharing.description": "Opis",
        "settings.reservations.sharing.createInvite": "Utwórz zaproszenie",
        "settings.reservations.sharing.inviteReady": "Zaproszenie gotowe",
        "settings.reservations.sharing.inviteLink": "Link zaproszenia",
        "settings.reservations.sharing.copy": "Kopiuj",
        "settings.reservations.sharing.singleUseNotice": "Informacja",
        "settings.reservations.sharing.partners": "Połączone organizacje",
        "settings.reservations.sharing.noPartners": "Brak organizacji",
        "settings.reservations.sharing.pending": "Oczekujące zaproszenia",
        "settings.reservations.sharing.pendingInvite": "Zaproszenie",
        "settings.reservations.sharing.expires": "Wygasa",
        "settings.reservations.sharing.revoke": "Wycofaj",
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock("@lootlog/ui/components/card", () => ({
  Card: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@lootlog/ui/components/button", () => ({
  Button: ({
    children,
    size: _size,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
    variant?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@lootlog/ui/components/input", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@lootlog/ui/components/confirm-delete-dialog", () => ({
  ConfirmDeleteDialog: () => null,
}));

describe("ReservationSharingSettings", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.createdInvitationResponse = {
      id: "invitation-1",
      invitePath: "/reservation-sharing/invitations/invitation-1",
      createdAt: "2026-08-26T00:00:00.000Z",
      expiresAt: "2026-09-02T00:00:00.000Z",
    };
  });

  it("builds the invitation URL from the current web origin", () => {
    render(<ReservationSharingSettings />);

    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));

    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Link zaproszenia",
      }).value,
    ).toBe(
      `${window.location.origin}/reservation-sharing/invitations/invitation-1`,
    );
  });

  it("supports the previous API response during a Web-first rollout", () => {
    mocks.createdInvitationResponse = {
      id: "invitation-1",
      inviteUrl:
        "http://localhost/reservation-sharing/invitations/invitation-1",
      createdAt: "2026-08-26T00:00:00.000Z",
      expiresAt: "2026-09-02T00:00:00.000Z",
    };
    render(<ReservationSharingSettings />);

    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));

    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Link zaproszenia",
      }).value,
    ).toBe(
      `${window.location.origin}/reservation-sharing/invitations/invitation-1`,
    );
  });

  it("hides a newly created link after its invitation is revoked", async () => {
    render(<ReservationSharingSettings />);

    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));
    expect(
      screen.getByRole("textbox", { name: "Link zaproszenia" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Wycofaj" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", { name: "Link zaproszenia" }),
      ).toBeNull();
    });
  });
});
