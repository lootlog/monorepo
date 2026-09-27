import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createNotificationTest } from "../notification-test";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { createChatReadyRoom } from "@/features/chat/chat-test-fixtures";
import { readSeededReadyRoomCache } from "@/test/ready-room-fixtures";
import { useWindowsStore } from "@/store/windows.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useSettingsStore } from "@/store/settings.store";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { toast } from "sonner";
import { NotificationsList } from "./notifications-list";

let test: ReturnType<typeof createNotificationTest>;

const notification: StoredNotification = {
  createdAt: "2026-06-22T00:00:00.000Z",
  discordId: "discord-1",
  guildId: "guild-1",
  listKey: "notification-1",
  message: "hello",
  notificationId: "notification-1",
  receivedAtMs: 1,
  servers: ["guild-1"],
  type: "chat-mention",
  world: "world",
};

const createNotifications = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...notification,
    listKey: `notification-${index}`,
    notificationId: `notification-${index}`,
  }));

describe("NotificationsList", () => {
  beforeEach(() => {
    test = createNotificationTest();
    test.queryClient.setQueryData(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      [],
    );
  });
  afterEach(() => {
    act(() => {
      useSettingsStore.setState(useSettingsStore.getInitialState(), true);
      useNotificationsStore.setState(
        useNotificationsStore.getInitialState(),
        true,
      );
      useWindowsStore.getState().setOpen("party-finder", false);
      useWindowsStore.getState().setOpen("chat", false);
    });
    vi.useRealTimers();
  });

  const renderGatheringNotification = (applyResponse: () => Response) => {
    const room = createChatReadyRoom({ world: "luvia" });

    const gathering: StoredNotification = {
      ...notification,
      notificationId: room.notificationId,
      type: "party-gathering",
      character: room.organizerCharacter,
      world: room.world,
    };

    setTestRuntimeGame({
      hero: { accountId: "account-1", characterId: "101" },
    });
    useWindowsStore.getState().setOpen("notifications", true);
    useWindowsStore.getState().setOpen("party-finder", false);
    useWindowsStore.getState().setOpen("chat", false);
    useNotificationsStore.setState({ notifications: [gathering] });
    const apply = vi.fn<typeof fetch>(async () => applyResponse());

    const restoreApi = configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          const url = new URL(
            input instanceof Request ? input.url : String(input),
          );

          if (url.pathname.endsWith("/members/summary"))
            return Response.json([]);

          if (
            url.pathname ===
            `/messaging/party-gathering/${room.notificationId}/applications`
          )
            return apply(input, init);
          throw new Error(`Unexpected request: ${url.pathname}`);
        },
      },
    });

    onTestFinished(restoreApi);
    render(<NotificationsList notifications={[gathering]} />, {
      wrapper: test.wrapper,
    });

    return { apply, gathering, room };
  };

  it("opens chat with the joined gathering after applying from a notification", async () => {
    const { apply, room } = renderGatheringNotification(() =>
      Response.json(createChatReadyRoom({ world: "luvia" })),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Zgłoś się do zbiórki" }),
    );

    await waitFor(() =>
      expect(useWindowsStore.getState().chat.open).toBe(true),
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(false);
    expect(useWindowsStore.getState().notifications.open).toBe(false);
    expect(
      readSeededReadyRoomCache(test.queryClient).projections[
        room.notificationId
      ],
    ).toEqual(room);
    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("reports a rejected application and keeps the notification", async () => {
    const toastError = vi.spyOn(toast, "error");
    onTestFinished(() => toastError.mockRestore());

    const { apply, gathering } = renderGatheringNotification(() =>
      Response.json({ code: "ALREADY_JOINED_ELSEWHERE" }, { status: 409 }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Zgłoś się do zbiórki" }),
    );

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(useWindowsStore.getState().chat.open).toBe(false);
    expect(useNotificationsStore.getState().notifications).toEqual([gathering]);
  });

  it("slides the rows in view down from where they were when a notification arrives", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const rowHeight = 44;

    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
      rowHeight * 2,
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(
      rowHeight,
    );
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(
      function (this: HTMLElement) {
        const siblings = this.parentElement?.children;

        return siblings ? [...siblings].indexOf(this) * rowHeight : 0;
      },
    );

    const animate = vi.fn<HTMLElement["animate"]>();

    const original = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "animate",
    );

    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    onTestFinished(() => {
      if (original)
        Object.defineProperty(HTMLElement.prototype, "animate", original);
      else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    });

    const [first, second, third] = createNotifications(3);

    const view = render(<NotificationsList notifications={[first, second]} />, {
      wrapper: test.wrapper,
    });

    animate.mockClear();
    view.rerender(<NotificationsList notifications={[third, first, second]} />);

    // The first row moved into the second slot and slides down into it; the
    // second row left the viewport, so it moves without an animation.
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith(
      [
        { transform: `translateY(${-rowHeight}px)` },
        { transform: "translateY(0)" },
      ],
      expect.objectContaining({ duration: 220 }),
    );
  });

  it("renders without an animation class when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });

    render(<NotificationsList notifications={[notification]} />, {
      wrapper: test.wrapper,
    });

    expect(
      screen.getByText("hello").closest("[data-lootlog-notification-id]"),
    ).not.toHaveClass("ll:animate-in");
  });

  it("stages a presentation that atomically started from an empty store", () => {
    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 1,
      latestPresentationStartedEmpty: true,
    });

    render(<NotificationsList notifications={createNotifications(8)} />, {
      wrapper: test.wrapper,
    });

    expect(screen.getAllByText("hello")).toHaveLength(2);
  });

  it("renders an incremental presentation without bulk staging", () => {
    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 1,
      latestPresentationStartedEmpty: false,
    });

    render(<NotificationsList notifications={createNotifications(8)} />, {
      wrapper: test.wrapper,
    });

    expect(screen.getAllByText("hello")).toHaveLength(8);
  });

  it("finishes a CSS exit before manually removing the notification", () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ animationEffectsEnabled: true });

    const second = {
      ...notification,
      notificationId: "second",
      listKey: "second",
      message: "Second",
    };

    useNotificationsStore.setState({ notifications: [notification, second] });
    render(<NotificationsList notifications={[notification, second]} />, {
      wrapper: test.wrapper,
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: "Zamknij powiadomienie" })[0],
    );

    expect(
      screen.getByText("hello").closest("[data-lootlog-notification-id]"),
    ).toHaveClass("ll:animate-out", "ll:fade-out-0");
    expect(useNotificationsStore.getState().notifications).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([second]);
  });
});
