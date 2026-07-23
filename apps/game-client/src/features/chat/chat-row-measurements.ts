import type { ChatRenderableMessage } from "./chat.helpers";

export const pruneChatRowMeasurements = <T>(
  measuredRows: Map<string, T>,
  renderables: readonly Pick<ChatRenderableMessage, "key">[],
): void => {
  if (measuredRows.size === 0) return;

  const retainedKeys = new Set(renderables.map((renderable) => renderable.key));
  for (const measuredKey of measuredRows.keys()) {
    if (!retainedKeys.has(measuredKey)) {
      measuredRows.delete(measuredKey);
    }
  }
};
