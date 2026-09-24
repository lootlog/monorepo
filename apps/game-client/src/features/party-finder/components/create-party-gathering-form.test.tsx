import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { CreatePartyGatheringForm } from "./create-party-gathering-form";

const minGreaterThanMax =
  "Minimalny poziom nie może być większy niż maksymalny";

it("reports a minimum level above the maximum under the minimum level without sending", async () => {
  const user = userEvent.setup();
  const { request, wrapper } = createGuildPreferencesTest();
  render(<CreatePartyGatheringForm />, { wrapper });

  await user.type(screen.getByLabelText("Minimalny poziom"), "10");
  await user.type(screen.getByLabelText("Maksymalny poziom"), "5");
  await user.click(screen.getByRole("button", { name: "Utwórz zbiórkę" }));

  expect(await screen.findByText(minGreaterThanMax)).toBeVisible();
  expect(request).not.toHaveBeenCalled();

  await user.clear(screen.getByLabelText("Minimalny poziom"));
  await user.type(screen.getByLabelText("Minimalny poziom"), "5");

  expect(screen.queryByText(minGreaterThanMax)).not.toBeInTheDocument();
});
