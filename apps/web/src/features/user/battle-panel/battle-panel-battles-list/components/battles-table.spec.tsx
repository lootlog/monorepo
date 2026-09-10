// @vitest-environment happy-dom
import { createBattle } from "@/lib/testing/battle";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BattlesTable } from "./battles-table";

await initializeTestTranslations();

afterEach(cleanup);

it("selects and clears a battle exactly once when clicking the whole selection cell", async () => {
  const Wrapper = await createOrganizationTestWrapper();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BattlesTable battles={[createBattle()]} />
    </QueryClientProvider>,
    { wrapper: Wrapper },
  );
  await screen.findByRole("checkbox", {
    name: "battlePanel.bulk.selectRow",
  });

  const checkbox = () =>
    screen.getByRole("checkbox", { name: "battlePanel.bulk.selectRow" });

  const clickSelectionCell = () => {
    const label = checkbox().parentElement?.querySelector("label");

    if (!label) throw new Error("Missing selection label");
    fireEvent.click(label);
  };

  clickSelectionCell();
  expect(checkbox().getAttribute("aria-checked")).toBe("true");
  clickSelectionCell();
  expect(checkbox().getAttribute("aria-checked")).toBe("false");
  fireEvent.click(checkbox());
  expect(checkbox().getAttribute("aria-checked")).toBe("true");
});
