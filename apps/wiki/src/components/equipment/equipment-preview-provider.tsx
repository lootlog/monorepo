import { type ReactNode, useState } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  EquipmentPreviewContext,
  SetEquipmentPreviewContext,
} from "@/contexts/equipment-preview-context";

export function EquipmentPreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preview, setPreview] = useState<CatalogItemDtoOutput | null>(null);

  return (
    <SetEquipmentPreviewContext value={setPreview}>
      <EquipmentPreviewContext value={preview}>
        {children}
      </EquipmentPreviewContext>
    </SetEquipmentPreviewContext>
  );
}
