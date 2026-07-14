import { beforeEach, describe, expect, it } from "vitest";
import {
  createEventModeSelectionScope,
  useEventModeSelectionStore,
} from "./event-mode-selection.store";

describe("event mode selection store", () => {
  beforeEach(() => {
    localStorage.clear();
    useEventModeSelectionStore.setState({ selectedEventIdByScope: {} });
  });

  it("namespaces selections by Margonem account and normalized world", () => {
    const firstScope = createEventModeSelectionScope("account-1", "tempest");
    const secondScope = createEventModeSelectionScope("account-2", "tempest");

    useEventModeSelectionStore
      .getState()
      .setSelectedEventId(firstScope, "event-1");
    useEventModeSelectionStore
      .getState()
      .setSelectedEventId(secondScope, "event-2");

    expect(
      useEventModeSelectionStore.getState().selectedEventIdByScope,
    ).toEqual({
      "account-1:tempest": "event-1",
      "account-2:tempest": "event-2",
    });
  });
});
