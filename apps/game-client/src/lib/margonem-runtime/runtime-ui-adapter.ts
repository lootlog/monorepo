import type { Other } from "@lootlog/margonem/others";

type JQueryLike = {
  find?: (selector: string) => unknown;
};

type RuntimeWindow = Window & {
  $?: (element: Element) => JQueryLike;
};

export function refreshWhoIsHereRuntimeTooltip(
  characterId: string,
  row: HTMLElement,
  other: Other,
): void {
  const runtimeWindow = window as RuntimeWindow;
  const engine = window.Engine as
    | (typeof window.Engine & {
        whoIsHere?: {
          createTipWrapper?: (tipContainer: unknown, value: Other) => void;
          getWhoIsHereOther?: (id: string) => { $?: JQueryLike } | undefined;
        };
      })
    | undefined;
  const whoIsHere = engine?.whoIsHere;
  const listEntry = whoIsHere?.getWhoIsHereOther?.(characterId);
  let tipContainer = listEntry?.$?.find?.(".tip-container");
  if (!tipContainer) {
    const element = row.querySelector(".tip-container");
    tipContainer =
      element && runtimeWindow.$ ? runtimeWindow.$(element) : element;
  }
  whoIsHere?.createTipWrapper?.(tipContainer, other);
}
