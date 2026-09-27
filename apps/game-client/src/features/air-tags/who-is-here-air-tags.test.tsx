import { Profiler } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import type { AirTagTarget } from "@lootlog/schema/air-tag";
import { useOthersStore } from "@/store/others.store";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import { airTagReceiveController } from "./air-tag-receive-controller";
import { WhoIsHereAirTags } from "./who-is-here-air-tags";

const target = (overrides: Partial<AirTagTarget>): AirTagTarget => ({
  targetId: "1",
  nickname: "Target",
  relation: 6,
  x: 1,
  y: 1,
  observedAt: Date.now(),
  ...overrides,
});

afterEach(() => {
  airTagReceiveController.clear();
  useOthersStore.getState().clearOthers();
  document.body.innerHTML = "";
});

it("lists enemies seen through AirTags under the native players list and starts a private message on click", async () => {
  document.body.innerHTML =
    '<div class="whoishere-window"><div class="scroll-pane"><div class="player-list"></div></div></div>';
  const setPrivateMessageProcedure = vi.fn<(nick: string) => void>();

  testRuntimeWindow.Engine = {
    chatController: {
      getChatInputWrapper: () => ({ setPrivateMessageProcedure }),
    },
  };
  useOthersStore.getState().replaceOthers({
    seen: {
      accountId: "1",
      characterId: "seen",
      icon: "",
      level: 1,
      name: "Seen",
      profession: "w",
    },
  });
  render(<WhoIsHereAirTags />);

  act(() => {
    airTagReceiveController.beginSubscription("request", "aether", 7);
    airTagReceiveController.applySubscriptionAck({
      status: "accepted",
      requestId: "request",
      scopes: [
        {
          guildId: "guild-1",
          world: "aether",
          mapId: 7,
          epochId: "epoch",
          epochStartedAt: 1,
          revision: 1,
          targets: [
            target({ targetId: "hidden", nickname: "Hidden", lvl: 250 }),
            target({ targetId: "seen", nickname: "Seen" }),
            target({ targetId: "neutral", nickname: "Neutral", relation: 1 }),
          ],
        },
      ],
    });
  });

  const section = await screen.findByRole("region", {
    name: i18n.t("settings:airTags.whoIsHereTitle"),
  });

  expect(section.closest(".player-list")).toBeNull();
  expect(section.parentElement?.previousElementSibling).toHaveClass(
    "player-list",
  );
  const rows = within(section).getAllByRole("button");
  expect(rows).toHaveLength(1);

  await userEvent.click(rows[0]!);
  expect(setPrivateMessageProcedure).toHaveBeenCalledWith("Hidden");
});

it("does not re-render the section while AirTag updates only move players", async () => {
  document.body.innerHTML =
    '<div class="whoishere-window"><div class="player-list"></div></div>';
  testRuntimeWindow.Engine = { whoIsHere: { isShow: () => false } };
  const commits = vi.fn();
  const enemy = target({ targetId: "hidden", nickname: "Hidden" });

  render(
    <Profiler id="section" onRender={commits}>
      <WhoIsHereAirTags />
    </Profiler>,
  );
  act(() => {
    airTagReceiveController.beginSubscription("request", "aether", 7);
    airTagReceiveController.applySubscriptionAck({
      status: "accepted",
      requestId: "request",
      scopes: [
        {
          guildId: "guild-1",
          world: "aether",
          mapId: 7,
          epochId: "epoch",
          epochStartedAt: 1,
          revision: 1,
          targets: [enemy],
        },
      ],
    });
  });
  await screen.findByRole("button", { name: /Hidden/ });
  commits.mockClear();

  act(() => {
    for (let revision = 2; revision < 30; revision += 1) {
      airTagReceiveController.handleUpdate({
        guildId: "guild-1",
        world: "aether",
        mapId: 7,
        epochId: "epoch",
        epochStartedAt: 1,
        revision,
        target: { ...enemy, x: revision, observedAt: Date.now() },
      });
    }
  });
  await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  expect(commits).not.toHaveBeenCalled();
});
