import type { RawBattleParsedEvent } from "@/lib/api/battlelog-types";
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BattleEventEntry } from "./battle-event-entry";

const createEvent = (): RawBattleParsedEvent => ({
  actions: [],
  attackerHpPercentage: 100,
  attackerId: "1",
  defenderHpPercentage: 100,
  defenderId: "2",
});

type BattleEventEntryElementProps = {
  "data-battle-turn": number;
  onClick?: () => void;
};

const renderBattleEventEntry = (onSelect = vi.fn()) =>
  BattleEventEntry({
    event: createEvent(),
    eventIndex: 6,
    onSelect,
    turn: 7,
  });

const getBattleEventEntryElement = (
  element: ReturnType<typeof renderBattleEventEntry>,
) => {
  if (!isValidElement<BattleEventEntryElementProps>(element)) {
    throw new Error("Expected BattleEventEntry to return a React element");
  }

  return element as ReactElement<BattleEventEntryElementProps>;
};

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
    const element = getBattleEventEntryElement(
      renderBattleEventEntry(onSelect),
    );

    expect(element.props["data-battle-turn"]).toBe(7);
    element.props.onClick?.();

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
