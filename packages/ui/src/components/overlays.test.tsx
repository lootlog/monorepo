import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

it("uses the supplied accessible label for the sheet close action", async () => {
  render(
    <Sheet defaultOpen>
      <SheetContent closeLabel="Zamknij nawigację">
        <SheetTitle>Nawigacja</SheetTitle>
      </SheetContent>
    </Sheet>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Zamknij nawigację" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Nawigacja" }),
    ).not.toBeInTheDocument(),
  );
});
