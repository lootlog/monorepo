// @vitest-environment happy-dom
import type { RawBattleParsedEvent } from "@/lib/api/battlelog-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  it("moves focus to the adjacent turn with the arrow keys", () => {
    render(
      <ul>
        <BattleEventEntry
          event={createEvent()}
          eventIndex={6}
          turn={7}
          onSelect={vi.fn()}
        />
        <BattleEventEntry
          event={createEvent()}
          eventIndex={7}
          turn={8}
          onSelect={vi.fn()}
        />
      </ul>,
    );
    const [firstRow, secondRow] = screen.getAllByRole("button");
    firstRow?.focus();
    fireEvent.keyDown(firstRow!, { key: "ArrowDown" });

    expect(document.activeElement).toBe(secondRow);

    fireEvent.keyDown(secondRow!, { key: "ArrowUp" });

    expect(document.activeElement).toBe(firstRow);
  });
});
