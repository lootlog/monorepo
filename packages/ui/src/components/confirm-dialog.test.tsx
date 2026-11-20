import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";

afterEach(cleanup);

function deferred() {
  let resolve = () => {};

  let reject: (error: Error) => void = () => {};

  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

it("keeps the confirmation open while saving and after failure, then closes after a successful retry", async () => {
  const user = userEvent.setup();
  const firstAttempt = deferred();
  const retry = deferred();

  const onConfirm = vi
    .fn<() => Promise<void>>()
    .mockReturnValueOnce(firstAttempt.promise)
    .mockReturnValueOnce(retry.promise);

  render(
    <ConfirmDialog
      title="Delete item"
      description="It cannot be undone."
      onConfirm={onConfirm}
      trigger={<Button>Open</Button>}
      confirmButtonLabel="Delete"
      cancelButtonLabel="Cancel"
    />,
  );
  await user.click(screen.getByRole("button", { name: "Open" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  expect(onConfirm).toHaveBeenCalledOnce();
  await act(() =>
    Promise.resolve().then(() =>
      firstAttempt.reject(new Error("Request failed")),
    ),
  );
  expect(screen.getByRole("button", { name: "Delete" })).not.toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).toHaveBeenCalledTimes(2);
  await act(() => Promise.resolve().then(() => retry.resolve()));
  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
});

it("unlocks a typed confirmation only for the exact name", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();

  render(
    <ConfirmDialog
      open
      onOpenChange={() => {}}
      title="Delete event"
      description="It cannot be undone."
      confirmText="Smocza Jama"
      confirmLabel="Type the event name"
      onConfirm={onConfirm}
      confirmButtonLabel="Delete"
      cancelButtonLabel="Cancel"
    />,
  );
  const input = screen.getByLabelText("Type the event name");
  await user.type(input, "Smocza");
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).not.toHaveBeenCalled();
  await user.type(input, " Jama ");
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

it("cannot be dismissed while work started outside the dialog is pending", async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();

  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      pending
      title="Delete battles"
      description="It cannot be undone."
      onConfirm={vi.fn()}
      confirmButtonLabel="Delete"
      cancelButtonLabel="Cancel"
    />,
  );
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await user.keyboard("{Escape}");
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
});
