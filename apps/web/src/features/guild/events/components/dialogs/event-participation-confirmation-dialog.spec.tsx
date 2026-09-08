import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getListPendingParticipationConfirmationsQueryKey,
  type PendingParticipationConfirmationsResponseDto,
} from "@lootlog/client/main";
import { initializeTestTranslations } from "@/lib/testing/i18n";
// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render as renderElement,
  screen,
} from "@testing-library/react";
import type { ReactElement } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { EventParticipationConfirmationDialog } from "./event-participation-confirmation-dialog";

const initialData: PendingParticipationConfirmationsResponseDto = {
  items: [],
  expiredItems: [],
};
const mocks = {
  confirmParticipation: vi.fn<() => Promise<Response>>(),
  data: initialData,
};
let queryClient: QueryClient;
let requests: Request[];
const queryKey = getListPendingParticipationConfirmationsQueryKey({
  guildId: "guild-1",
  eventId: "event-1",
});
function render(element: ReactElement) {
  queryClient.setQueryData(queryKey, mocks.data);
  return renderElement(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>,
  );
}
async function expectAcknowledged(killId: string) {
  await act(() => vi.advanceTimersByTimeAsync(0));
  const request = requests.find((request) =>
    request.url.endsWith("/participation-confirmations/expired/acknowledge"),
  );
  if (!request) throw new Error("Missing acknowledgement request");
  expect(new URL(request.url).pathname).toBe(
    "/guilds/guild-1/events/event-1/participation-confirmations/expired/acknowledge",
  );
  expect(await request.json()).toEqual({ killIds: [killId] });
}
await initializeTestTranslations({});

describe("EventParticipationConfirmationDialog", () => {
  it("keeps bulk confirmation busy after one request fails until every request settles", async () => {
    let failFirst = (_reason: Error) => {};
    let finishLast = () => {};
    const first = new Promise<Response>((_resolve, reject) => {
      failFirst = reject;
    });
    const last = new Promise<Response>((resolve) => {
      finishLast = () => resolve(Response.json({}));
    });
    mocks.confirmParticipation
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(last);
    mocks.data.items = [
      createConfirmation({
        killId: "first",
        confirmationDeadlineAt: "2026-07-28T12:01:00.000Z",
      }),
      createConfirmation({
        killId: "last",
        confirmationDeadlineAt: "2026-07-28T12:01:00.000Z",
      }),
    ];
    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );
    const bulk = screen.getByRole("button", { name: "Potwierdź wszystko" });
    fireEvent.click(bulk);
    expect(bulk.getAttribute("aria-busy")).toBe("true");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      failFirst(new Error("request failed"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(bulk.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Potwierdź wszystko" })).toBe(
      bulk,
    );
    await act(async () => {
      finishLast();
      await last;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(bulk.hasAttribute("disabled")).toBe(false);
    expect(bulk.getAttribute("aria-busy")).not.toBe("true");
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-07-28T12:00:00.000Z");
    vi.clearAllMocks();
    mocks.data = {
      items: [],
      expiredItems: [],
    };
    requests = [];
    mocks.confirmParticipation.mockReset().mockResolvedValue(Response.json({}));
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    onTestFinished(() => queryClient.clear());
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: (input, init) => {
            const request = new Request(input, init);
            requests.push(request);
            if (request.url.endsWith("/confirm-participation"))
              return mocks.confirmParticipation();
            return Promise.resolve(
              Response.json(request.method === "GET" ? mocks.data : {}),
            );
          },
        },
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows an expired confirmation and acknowledges it after dismissal", async () => {
    mocks.data.expiredItems = [
      createConfirmation({
        killId: "expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await expectAcknowledged("expired-kill");
  });

  it("shows and acknowledges a stale pending response whose deadline has passed", async () => {
    mocks.data.items = [
      createConfirmation({
        killId: "stale-pending-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await expectAcknowledged("stale-pending-kill");
  });

  it("shows expiration feedback when the last active confirmation expires", async () => {
    mocks.data.items = [
      createConfirmation({
        killId: "active-kill",
        confirmationDeadlineAt: "2026-07-28T12:00:01.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1_001);
    });

    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await expectAcknowledged("active-kill");
  });

  it("keeps a confirmation actionable at its exact deadline", async () => {
    mocks.data.items = [
      createConfirmation({
        killId: "deadline-kill",
        confirmationDeadlineAt: "2026-07-28T12:00:00.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByRole("button", { name: "Potwierdź" })).toBeTruthy();
  });

  it("shows expired feedback alongside a new active confirmation without submitting expired kills", async () => {
    mocks.data.items = [
      createConfirmation({
        killId: "active-kill",
        confirmationDeadlineAt: "2026-07-28T12:01:00.000Z",
      }),
      createConfirmation({
        killId: "newly-expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];
    mocks.data.expiredItems = [
      createConfirmation({
        killId: "expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:58:00.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Potwierdź" })).toHaveLength(
      1,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Potwierdź wszystko",
      }),
    );

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.confirmParticipation).toHaveBeenCalledTimes(1);
    expect(
      requests
        .filter((request) => request.url.endsWith("/confirm-participation"))
        .map((request) => new URL(request.url).pathname),
    ).toEqual([
      "/guilds/guild-1/events/event-1/kills/active-kill/confirm-participation",
    ]);
  });

  it("allows a future active confirmation after expired feedback is dismissed", async () => {
    mocks.data.expiredItems = [
      createConfirmation({
        killId: "expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    mocks.data = {
      expiredItems: [],
      items: [
        createConfirmation({
          killId: "future-active-kill",
          confirmationDeadlineAt: "2026-07-28T12:01:00.000Z",
        }),
      ],
    };
    act(() => {
      queryClient.setQueryData(queryKey, mocks.data);
    });
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("button", { name: "Potwierdź" })).toBeTruthy();
  });
});

function createConfirmation({
  killId,
  confirmationDeadlineAt,
}: {
  killId: string;
  confirmationDeadlineAt: string;
}) {
  return {
    killId,
    killedAt: "2026-07-28T11:55:00.000Z",
    confirmationDeadlineAt,
    heroNpc: {
      id: "hero-1",
      npcId: 123,
      npcName: "Potulny Berserker",
      npcIcon: null,
      npcLvl: 284,
    },
  };
}
