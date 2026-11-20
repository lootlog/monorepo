// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UnsavedChangesBar } from "./unsaved-changes-bar";
import "@/i18n/config";

afterEach(cleanup);

const renderForm = (isDirty: boolean) => {
  const onSubmit = vi.fn();

  const view = render(
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input aria-label="Name" />
        <UnsavedChangesBar
          isDirty={isDirty}
          isSubmitting={false}
          onReset={() => undefined}
        />
      </form>
      <div role="dialog">
        <form>
          <input aria-label="Channel" />
        </form>
      </div>
    </>,
  );

  return { ...view, onSubmit };
};

it("saves the page's form with Ctrl+S only while it has changes", () => {
  const clean = renderForm(false);

  fireEvent.keyDown(clean.getByLabelText("Name"), { key: "s", ctrlKey: true });
  expect(clean.onSubmit).not.toHaveBeenCalled();
  cleanup();

  const dirty = renderForm(true);

  fireEvent.keyDown(dirty.getByLabelText("Name"), { key: "s", ctrlKey: true });
  expect(dirty.onSubmit).toHaveBeenCalledTimes(1);
});

it("leaves Ctrl+S in a dialog to the dialog instead of saving the form under it", () => {
  const { getByLabelText, onSubmit } = renderForm(true);

  fireEvent.keyDown(getByLabelText("Channel"), { key: "s", ctrlKey: true });
  expect(onSubmit).not.toHaveBeenCalled();
});
