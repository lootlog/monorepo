import { createContext, useContext } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";

type SetPreview = (item: CatalogItemDtoOutput | null) => void;

/**
 * The item the User points at, compared with what the set wears. Its setter
 * has a context of its own, so pointing at items re-renders only the readers
 * of the preview, not every item in a list.
 */
export const EquipmentPreviewContext =
  createContext<CatalogItemDtoOutput | null>(null);

export const SetEquipmentPreviewContext = createContext<SetPreview>(() => {});

export const useEquipmentPreview = () => useContext(EquipmentPreviewContext);

export const useSetEquipmentPreview = () =>
  useContext(SetEquipmentPreviewContext);
