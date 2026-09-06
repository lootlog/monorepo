// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GeneralForm } from "./general-form";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("@/hooks/context/use-guild-id", () => ({
  useGuildId: () => "guild-1",
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@lootlog/client/main", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lootlog/client/main")>();
  const { useMutation } = await import("@tanstack/react-query");
  return {
    ...actual,
    useGuildsControllerGetGuildById: () => ({ data: undefined }),
    useGuildsControllerUpdateGuildConfig: () =>
      useMutation({ mutationFn: mocks.save }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("keeps save busy for the network request and restores it after failure", async () => {
  let rejectSave: (reason?: unknown) => void = () => {};
  mocks.save.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <GeneralForm />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "new-name" },
  });
  const save = await screen.findByRole<HTMLButtonElement>("button", {
    name: "common.save",
  });
  fireEvent.click(save);
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(save.disabled).toBe(true));
  expect(save.getAttribute("aria-busy")).toBe("true");
  fireEvent.click(save);
  const form = save.closest("form");
  if (!form) throw new Error("Save button must belong to a form");
  fireEvent.submit(form);
  expect(mocks.save).toHaveBeenCalledTimes(1);
  rejectSave(new Error("Request failed"));
  await waitFor(() => expect(save.disabled).toBe(false));
  expect(screen.getByRole("button", { name: "common.save" })).toBe(save);
  queryClient.clear();
});
