import { useEffect, useRef } from "react";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import type { SettingsControlId } from "@/features/settings/settings-manifest";

/**
 * Connects a rendered control container to the settings UI store: it is
 * scrolled into view when search opens it and highlighted for a moment.
 */
export const useSettingsControlHighlight = <TElement extends HTMLElement>(
  controlId: SettingsControlId | undefined,
) => {
  const ref = useRef<TElement>(null);

  const highlighted = useSettingsUiStore(
    (state) =>
      controlId !== undefined && state.highlightedControlId === controlId,
  );

  const pendingScroll = useSettingsUiStore(
    (state) =>
      controlId !== undefined && state.pendingScrollControlId === controlId,
  );

  const clearPendingScroll = useSettingsUiStore(
    (state) => state.clearPendingScroll,
  );

  useEffect(() => {
    if (!pendingScroll) return;
    ref.current?.scrollIntoView({ block: "center" });
    clearPendingScroll();
  }, [clearPendingScroll, pendingScroll]);

  return {
    ref,
    highlighted,
    dataAttributes: {
      "data-settings-control": controlId,
      "data-settings-highlighted": highlighted ? "true" : undefined,
    },
  };
};
