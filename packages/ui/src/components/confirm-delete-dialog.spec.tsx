import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Button } from "./button";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

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
    <ConfirmDeleteDialog
      title="Delete item"
      onConfirm={onConfirm}
      trigger={<Button>Open</Button>}
      confirmButtonLabel="Delete"
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
