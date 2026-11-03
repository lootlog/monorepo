import type { FocusEvent } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { useSetEquipmentPreview } from "@/contexts/equipment-preview-context";

/** Pointing at or focusing an item compares it with the set; leaving it ends the preview. */
export const useItemPreviewHandlers = (item: CatalogItemDtoOutput) => {
  const setPreview = useSetEquipmentPreview();

  return {
    onPointerEnter: () => setPreview(item),
    onPointerLeave: () => setPreview(null),
    onFocus: () => setPreview(item),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setPreview(null);
      }
    },
  };
};
