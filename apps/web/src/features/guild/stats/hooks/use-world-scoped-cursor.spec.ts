// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useWorldScopedCursor } from "./use-world-scoped-cursor";

it("starts over on a world the reader comes back to", () => {
  const { result, rerender } = renderHook(
    ({ world }: { world: string | null }) => useWorldScopedCursor(world),
    { initialProps: { world: "tempest" } },
  );

  act(() => result.current[1](20));
  expect(result.current[0]).toBe(20);

  rerender({ world: "pandora" });
  expect(result.current[0]).toBe(0);

  rerender({ world: "tempest" });
  expect(result.current[0]).toBe(0);
});
