import type {
  CharacterTooltipTransform,
  CharacterTooltipTransformContext,
} from "./types";

let currentTransform: CharacterTooltipTransform | null = null;

export const characterTooltipTransforms = {
  register(transform: CharacterTooltipTransform): () => void {
    currentTransform = transform;

    return () => {
      if (currentTransform === transform) currentTransform = null;
    };
  },

  clear(): void {
    currentTransform = null;
  },

  apply(context: CharacterTooltipTransformContext): string {
    if (!currentTransform) return context.currentHtml;

    try {
      return currentTransform(context) ?? context.currentHtml;
    } catch (error) {
      console.warn("[MargonemTooltips] Failed to transform tooltip:", error);

      return context.currentHtml;
    }
  },
};
