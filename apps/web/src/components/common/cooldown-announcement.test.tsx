// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CooldownAnnouncement } from "./cooldown-announcement";

await initializeTestTranslations({
  "common.cooldown.started": "started {{time}}",
  "common.cooldown.ended": "ended",
});

afterEach(cleanup);

const idle = { isExpired: true, label: "0:00" };

const coolingDown = (label: string) => ({ isExpired: false, label });

const liveText = (container: HTMLElement) =>
  container.querySelector("[aria-live]")?.textContent;

describe("CooldownAnnouncement", () => {
  it("announces the start and the end of a cooldown, not each tick", () => {
    const { container, rerender } = render(
      <CooldownAnnouncement countdown={idle} />,
    );

    expect(liveText(container)).toBe("");

    rerender(<CooldownAnnouncement countdown={coolingDown("2:40")} />);
    expect(liveText(container)).toBe("started 2:40");

    rerender(<CooldownAnnouncement countdown={coolingDown("2:39")} />);
    expect(liveText(container)).toBe("started 2:40");

    rerender(<CooldownAnnouncement countdown={idle} />);
    expect(liveText(container)).toBe("ended");
  });

  it("stays silent about a cooldown that was already running when it mounted", () => {
    const { container } = render(
      <CooldownAnnouncement countdown={coolingDown("4:00")} />,
    );

    expect(liveText(container)).toBe("");
  });
});
