import type { Other } from "@lootlog/margonem/others";
import type { RuntimeInterface } from "@/lib/margonem-runtime/runtime.types";

export type CharacterTooltipTransformContext = {
  character: Other;
  /** NI and SI draw tips with different markup and stylesheets. */
  interface: RuntimeInterface;
  baseHtml: string;
  currentHtml: string;
};

export type CharacterTooltipTransform = (
  context: CharacterTooltipTransformContext,
) => string | null | undefined | void;
