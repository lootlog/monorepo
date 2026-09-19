import { renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import { useLocalStorage } from "./use-local-storage";

const stringSchema = z.string();

afterEach(() => localStorage.clear());

it("falls back on malformed persisted data without overwriting it during hydration", () => {
  localStorage.setItem("setting", JSON.stringify({ wrong: "shape" }));

  const { result, unmount } = renderHook(() =>
    useLocalStorage("setting", "default", stringSchema),
  );

  expect(result.current[0]).toBe("default");
  expect(localStorage.getItem("setting")).toBe('{"wrong":"shape"}');
  unmount();
});

it("hydrates a new character's key without persisting the previous character's value", () => {
  localStorage.setItem("first", '"one"');
  localStorage.setItem("second", '"two"');

  const { result, rerender, unmount } = renderHook(
    ({ key }) => useLocalStorage(key, "default", stringSchema),
    { initialProps: { key: "first" } },
  );

  expect(result.current[0]).toBe("one");
  rerender({ key: "second" });
  expect(result.current[0]).toBe("two");
  expect(localStorage.getItem("first")).toBe('"one"');
  expect(localStorage.getItem("second")).toBe('"two"');
  unmount();
});
