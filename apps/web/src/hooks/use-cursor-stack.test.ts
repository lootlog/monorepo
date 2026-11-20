// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useCursorStack } from "./use-cursor-stack";

it("returns to earlier pages and starts over when the filters change", () => {
  const { result, rerender } = renderHook(
    ({ resetKey }: { resetKey: string }) => useCursorStack(resetKey),
    { initialProps: { resetKey: "tempest" } },
  );

  act(() => result.current.goToNext("page-2"));
  act(() => result.current.goToNext("page-3"));
  expect(result.current.cursor).toBe("page-3");
  expect(result.current.pageIndex).toBe(2);

  act(() => result.current.goToPrevious());
  expect(result.current.cursor).toBe("page-2");

  act(() => result.current.goToPrevious());
  expect(result.current.cursor).toBeUndefined();
  expect(result.current.hasPrev).toBe(false);

  act(() => result.current.goToNext("page-2"));
  rerender({ resetKey: "pandora" });
  expect(result.current.cursor).toBeUndefined();
  expect(result.current.pageIndex).toBe(0);
});
