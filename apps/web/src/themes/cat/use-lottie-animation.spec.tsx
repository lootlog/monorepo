// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import { useLottieAnimation } from "./use-lottie-animation";

afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.unstubAllGlobals();
});

it("rejects an HTTP error payload and allows the animation request to recover", async () => {
  const fetchAnimation = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ error: "missing" }, { status: 404 }));
  vi.stubGlobal("fetch", fetchAnimation);
  queryClient.setQueryDefaults(["lottie-animation"], { retry: false });
  const { result } = renderHook(() => useLottieAnimation("/lottie/test.json"));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data).toBeUndefined();
  fetchAnimation.mockResolvedValue(Response.json({ fr: 30, layers: [] }));
  await act(() => result.current.refetch());
  await waitFor(() =>
    expect(result.current.data).toEqual({ fr: 30, layers: [] }),
  );
});
