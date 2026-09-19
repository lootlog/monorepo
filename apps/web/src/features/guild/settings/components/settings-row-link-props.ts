import type { ComponentProps } from "react";

const isRowActionTarget = (target: EventTarget) => {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("button,a")) {
    return true;
  }

  const actionContent = target
    .closest("td")
    ?.querySelector("[data-settings-row-action]");

  return Boolean(actionContent);
};

/**
 * Makes a settings table row behave as a link to its details page. Controls,
 * links, and the whole cell around `data-settings-row-action` content keep
 * their own click behavior.
 */
export const getSettingsRowLinkProps = (openDetails: () => void) => {
  return {
    role: "link",
    tabIndex: 0,
    onClickCapture: (event) => {
      if (isRowActionTarget(event.target)) {
        return;
      }

      openDetails();
    },
    onKeyDown: (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      openDetails();
    },
  } satisfies ComponentProps<"tr">;
};
