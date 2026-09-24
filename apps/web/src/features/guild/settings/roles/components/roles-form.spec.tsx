// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createOrganizationTestRouter } from "@/lib/testing/router";
import { configureApiClients } from "@lootlog/client/transport";
import type { RoleResponseDtoOutput } from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { RolesForm } from "./roles-form";

await initializeTestTranslations();

afterEach(cleanup);

const role = {
  id: "role-1",
  guildId: "guild-1",
  name: "Loot readers",
  color: 0,
  position: 1,
  permissions: [Permission.LOOTLOG_ACCESS, Permission.LOOTLOG_LOOTS_READ],
  lvlRangeFrom: 0,
  lvlRangeTo: 500,
} satisfies RoleResponseDtoOutput;

const renderForm = async () => {
  const save = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(Response.json(role)),
  );

  onTestFinished(
    configureApiClients({
      main: { baseUrl: "https://api.test", fetch: save },
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => queryClient.clear());
  const router = createOrganizationTestRouter(<RolesForm role={role} />);
  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    save,
    from: await screen.findByRole<HTMLInputElement>("spinbutton", {
      name: "settings.roles.levelRangeFrom",
    }),
    to: screen.getByRole<HTMLInputElement>("spinbutton", {
      name: "settings.roles.levelRangeTo",
    }),
  };
};

const submitForm = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "common.save" }));
};

it.each([
  { fromValue: "100", toValue: "", invalidField: "to" },
  { fromValue: "", toValue: "300", invalidField: "from" },
  { fromValue: "400", toValue: "300", invalidField: "to" },
  { fromValue: "-1", toValue: "300", invalidField: "from" },
  { fromValue: "100", toValue: "501", invalidField: "to" },
  { fromValue: "100.5", toValue: "300", invalidField: "from" },
])(
  "blocks saving the visibility range $fromValue–$toValue with an accessible field error",
  async ({ fromValue, toValue, invalidField }) => {
    const { save, from, to } = await renderForm();
    fireEvent.change(from, { target: { value: fromValue } });
    fireEvent.change(to, { target: { value: toValue } });
    await submitForm();

    const error = await screen.findByRole("alert");
    const input = invalidField === "from" ? from : to;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(
      error.id,
    );
    expect(error.textContent?.trim()).not.toBe("");
    expect(save).not.toHaveBeenCalled();
  },
);

it("lets a user correct an inverted range and saves integer limits with the existing permissions", async () => {
  const { save, from, to } = await renderForm();
  fireEvent.change(from, { target: { value: "300" } });
  fireEvent.change(to, { target: { value: "100" } });
  await submitForm();
  await screen.findByRole("alert");
  expect(save).not.toHaveBeenCalled();

  fireEvent.change(to, { target: { value: "300" } });
  await submitForm();
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const request = new Request("https://api.test", save.mock.calls[0]?.[1]);
  expect(await request.json()).toEqual({
    lvlRangeFrom: 300,
    lvlRangeTo: 300,
    permissions: role.permissions,
  });
  expect(screen.queryByRole("alert")).toBeNull();
});
