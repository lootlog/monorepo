// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AddCategoryForm } from "./add-category-form";

await initializeTestTranslations();

afterEach(cleanup);

it("does not create a category while Enter confirms an IME composition", () => {
  const onAddCategory = vi.fn();
  render(<AddCategoryForm onAddCategory={onAddCategory} />);
  fireEvent.click(screen.getByRole("button"));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "Test" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(onAddCategory).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter", isComposing: false });
  expect(onAddCategory).toHaveBeenCalledExactlyOnceWith("Test");
});
