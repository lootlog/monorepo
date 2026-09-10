import type { Other } from "@lootlog/margonem/others";
import type { MargonemTooltipCharacter } from "@/lib/margonem-tooltips/types";

// CanvasTip forwards event/object to jQuery tipShow/tipHide; addons may wrap
// these calls. Preserve the foreign arguments and return values unchanged.
export type RuntimeCanvasTip = {
  hide?: (event: unknown) => unknown;
  show?: (event: unknown, object: unknown) => unknown;
};

// The found container passes directly to WhoIsHere.createTipWrapper, which
// invokes the native jQuery .tip extension; Lootlog does not inspect this value.
type JQueryLike = {
  find?: (selector: string) => unknown;
};

type TooltipRuntimeWindow = Window & {
  $?: (element: Element) => JQueryLike;
  Engine?: {
    canvasTip?: RuntimeCanvasTip;
    hero?: MargonemTooltipCharacter;
    whoIsHere?: {
      createTipWrapper?: (tipContainer: unknown, value: Other) => void;
      getWhoIsHereOther?: (id: string) => { $?: JQueryLike } | undefined;
    };
  };
};

const getRuntimeWindow = (): TooltipRuntimeWindow => window;

export const getRuntimeCanvasTip = (): RuntimeCanvasTip | undefined => {
  return getRuntimeWindow().Engine?.canvasTip;
};

export const getRuntimeHeroTooltipOwner = ():
  | MargonemTooltipCharacter
  | undefined => {
  return getRuntimeWindow().Engine?.hero;
};

export function refreshWhoIsHereRuntimeTooltip(
  characterId: string,
  row: HTMLElement,
  other: Other,
): void {
  const runtimeWindow = getRuntimeWindow();
  const whoIsHere = runtimeWindow.Engine?.whoIsHere;
  const listEntry = whoIsHere?.getWhoIsHereOther?.(characterId);
  let tipContainer = listEntry?.$?.find?.(".tip-container");

  if (!tipContainer) {
    const element = row.querySelector(".tip-container");
    tipContainer =
      element && runtimeWindow.$ ? runtimeWindow.$(element) : element;
  }

  whoIsHere?.createTipWrapper?.(tipContainer, other);
}
