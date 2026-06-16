import type {
  CharacterTooltipTransform,
  CharacterTooltipTransformContext,
} from "./types";

export class CharacterTooltipTransformRegistry {
  private transforms = new Set<CharacterTooltipTransform>();

  register(transform: CharacterTooltipTransform): () => void {
    this.transforms.add(transform);

    return () => {
      this.transforms.delete(transform);
    };
  }

  clear(): void {
    this.transforms.clear();
  }

  apply(context: CharacterTooltipTransformContext): string {
    let currentHtml = context.currentHtml;

    for (const transform of this.transforms) {
      try {
        const result = transform({
          ...context,
          currentHtml,
        });

        if (typeof result === "string") {
          currentHtml = result;
        }
      } catch (error) {
        console.warn("[MargonemTooltips] Failed to transform tooltip:", error);
      }
    }

    return currentHtml;
  }
}

export const characterTooltipTransforms =
  new CharacterTooltipTransformRegistry();
