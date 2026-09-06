import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Copy, Save } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";
import { Tooltip, TooltipTrigger } from "./tooltip";
import { AlertDialog, AlertDialogTrigger } from "./alert-dialog";

afterEach(cleanup);

it("keeps its action name and blocks pointer and keyboard activation until loading ends", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn<() => void>();
  const { rerender } = render(
    <Button loading onClick={onClick}>
      Save
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Save" });
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).toBeDisabled();
  await user.click(button);
  await user.keyboard("{Enter} ");
  expect(onClick).not.toHaveBeenCalled();

  rerender(
    <Button loading={false} onClick={onClick}>
      Save
    </Button>,
  );
  expect(button).not.toBeDisabled();
  expect(button).not.toHaveAttribute("aria-busy", "true");
  await user.click(button);
  expect(onClick).toHaveBeenCalledOnce();

  rerender(
    <Button loading={false} disabled onClick={onClick}>
      Save
    </Button>,
  );
  expect(button).toBeDisabled();
});

it("keeps icon-only buttons named while showing a decorative loading indicator", () => {
  render(
    <Button size="icon" loading aria-label="Copy">
      <Copy />
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Copy" });
  expect(button).toBeDisabled();
  expect(button.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
});

it("supports icon props and loading through nested Base UI render composition", async () => {
  const user = userEvent.setup();
  const onOpenChange =
    vi.fn<NonNullable<ComponentProps<typeof AlertDialog>["onOpenChange"]>>();
  const { rerender } = render(
    <AlertDialog onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render=<AlertDialogTrigger
            render={
              <Button loading icon=<Save />>
                Save
              </Button>
            }
          />
        />
      </Tooltip>
    </AlertDialog>,
  );
  const button = screen.getByRole("button", { name: "Save" });
  expect(button).toHaveAttribute("aria-busy", "true");
  await user.click(button);
  expect(onOpenChange).not.toHaveBeenCalled();
  rerender(
    <AlertDialog onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render=<AlertDialogTrigger
            render={
              <Button loading={false} icon=<Save />>
                Save
              </Button>
            }
          />
        />
      </Tooltip>
    </AlertDialog>,
  );
  await user.click(button);
  expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
});
