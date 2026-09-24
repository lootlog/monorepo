import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { CreatePartyGatheringForm } from "./create-party-gathering-form";

const minGreaterThanMax = "Min lvl nie może być większy niż max lvl";

it("reports a minimum level above the maximum under the minimum level without sending", async () => {
  const user = userEvent.setup();
  const { request, wrapper } = createGuildPreferencesTest();
  render(<CreatePartyGatheringForm />, { wrapper });

  await user.type(screen.getByLabelText("Min lvl"), "10");
  await user.type(screen.getByLabelText("Max lvl"), "5");
  await user.click(screen.getByRole("button", { name: "Szukaj grupy" }));

  expect(await screen.findByText(minGreaterThanMax)).toBeVisible();
  expect(request).not.toHaveBeenCalled();

  await user.clear(screen.getByLabelText("Min lvl"));
  await user.type(screen.getByLabelText("Min lvl"), "5");

  expect(screen.queryByText(minGreaterThanMax)).not.toBeInTheDocument();
});
