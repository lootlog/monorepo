// @vitest-environment happy-dom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useResetRejectedBattlePanelCursor } from "./use-reset-rejected-battle-panel-cursor";

afterEach(cleanup);

it("returns to the first page only when the API rejects the cursor in the URL", () => {
  const reset = vi.fn();

  const { rerender } = renderHook<
    void,
    Parameters<typeof useResetRejectedBattlePanelCursor>[0]
  >((props) => useResetRejectedBattlePanelCursor(props), {
    initialProps: { cursor: "stale", error: { status: 503 }, reset },
  });

  expect(reset).not.toHaveBeenCalled();

  rerender({ cursor: null, error: { status: 400 }, reset });
  expect(reset).not.toHaveBeenCalled();

  rerender({ cursor: "stale", error: { status: 400 }, reset });
  expect(reset).toHaveBeenCalledTimes(1);
});
