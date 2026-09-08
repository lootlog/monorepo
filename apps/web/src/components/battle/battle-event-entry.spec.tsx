// @vitest-environment happy-dom
import type { RawBattleParsedEvent } from "@/lib/api/battlelog-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BattleEventEntry } from "./battle-event-entry";

const createEvent = (): RawBattleParsedEvent => ({
  actions: [],
  attackerHpPercentage: 100,
  attackerId: "1",
  defenderHpPercentage: 100,
  defenderId: "2",
});

afterEach(cleanup);

describe("BattleEventEntry", () => {
  it("renders a subtle turn badge and keeps the battle turn data attribute", () => {
    const html = renderToStaticMarkup(
      <BattleEventEntry event={createEvent()} eventIndex={6} turn={7} />,
    );

    expect(html).toContain("#7");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-battle-turn="7"');
  });

  it("keeps the row selectable", () => {
    const onSelect = vi.fn();
    render(
      <BattleEventEntry
        event={createEvent()}
        eventIndex={6}
        turn={7}
        onSelect={onSelect}
      />,
    );
    const element = screen.getByRole("button");
    expect(element.getAttribute("data-battle-turn")).toBe("7");
    fireEvent.click(element);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
