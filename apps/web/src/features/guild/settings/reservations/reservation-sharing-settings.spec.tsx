import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationSharingSettings } from "./reservation-sharing-settings";

await initializeTestTranslations({
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
});

type InvitationResponse = {
  id: string;
  createdAt: string;
  expiresAt: string;
} & ({ invitePath: string } | { inviteUrl: string });

const defaultInvitation = {
  id: "invitation-1",
  invitePath: "/reservation-sharing/invitations/invitation-1",
  createdAt: "2026-08-26T00:00:00.000Z",
  expiresAt: "2026-09-02T00:00:00.000Z",
};

let createdInvitationResponse: InvitationResponse = defaultInvitation;

let restoreClient = () => {};

const renderSettings = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  restoreClient = configureApiClients({
    main: { baseUrl: "https://api.test" },
  });
  let revoked = false;
  vi.stubGlobal(
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);

      if (request.method === "POST")
        return Response.json(createdInvitationResponse);

      if (request.method === "DELETE") {
        revoked = true;

        return new Response(null, { status: 204 });
      }

      return Response.json({
        shares: [],
        pendingInvitations: revoked ? [] : [defaultInvitation],
      });
    },
  );
  const Wrapper = await createOrganizationTestWrapper();
  render(
    <Wrapper>
      <QueryClientProvider client={client}>
        <ReservationSharingSettings />
      </QueryClientProvider>
    </Wrapper>,
  );
  await screen.findByText("Oczekujące zaproszenia");
};

describe("ReservationSharingSettings", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    restoreClient();
    vi.unstubAllGlobals();
    createdInvitationResponse = defaultInvitation;
  });

  it("builds the invitation URL from the current web origin", async () => {
    await renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));

    expect(
      (
        await screen.findByRole<HTMLInputElement>("textbox", {
          name: "Link zaproszenia",
        })
      ).value,
    ).toBe(
      `${window.location.origin}/reservation-sharing/invitations/invitation-1`,
    );
  });

  it("supports the previous API response during a Web-first rollout", async () => {
    createdInvitationResponse = {
      id: "invitation-1",
      inviteUrl:
        "http://localhost/reservation-sharing/invitations/invitation-1",
      createdAt: "2026-08-26T00:00:00.000Z",
      expiresAt: "2026-09-02T00:00:00.000Z",
    };
    await renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));

    expect(
      (
        await screen.findByRole<HTMLInputElement>("textbox", {
          name: "Link zaproszenia",
        })
      ).value,
    ).toBe(
      `${window.location.origin}/reservation-sharing/invitations/invitation-1`,
    );
  });

  it("hides a newly created link after its invitation is revoked", async () => {
    await renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));
    expect(
      await screen.findByRole("textbox", { name: "Link zaproszenia" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Wycofaj" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", { name: "Link zaproszenia" }),
      ).toBeNull();
    });
  });
  it("keeps copy busy until the clipboard request settles and allows retry after failure", async () => {
    let rejectCopy: (cause?: unknown) => void = () => {};

    const writeText = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectCopy = reject;
        }),
    );

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));

    const copy = await screen.findByRole<HTMLButtonElement>("button", {
      name: "Kopiuj",
    });

    fireEvent.click(copy);
    await waitFor(() => expect(copy.disabled).toBe(true));
    expect(copy.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(copy);
    expect(writeText).toHaveBeenCalledTimes(1);
    rejectCopy(new Error("Clipboard unavailable"));
    await waitFor(() => expect(copy.disabled).toBe(false));
    expect(screen.getByRole("button", { name: "Kopiuj" })).toBe(copy);
  });
  it("restores copy after a synchronous clipboard exception", async () => {
    const writeText = vi.fn(() => {
      throw new Error("Clipboard unavailable");
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Utwórz zaproszenie" }));

    const copy = await screen.findByRole<HTMLButtonElement>("button", {
      name: "Kopiuj",
    });

    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(copy.disabled).toBe(false));
    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
  });
});
