import { type ReactNode, useEffect, useRef, useState } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  EquipmentPreviewContext,
  SetEquipmentPreviewContext,
} from "@/contexts/equipment-preview-context";

// Moving the pointer from one item to the next leaves one before it enters
// the other; the preview outlasts that gap instead of flashing back.
const PREVIEW_LINGER_MS = 120;

export function EquipmentPreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preview, setPreviewState] = useState<CatalogItemDtoOutput | null>(
    null,
  );

  const endTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(endTimeout.current), []);

  const setPreview = (item: CatalogItemDtoOutput | null) => {
    clearTimeout(endTimeout.current);

    if (item) {
      setPreviewState(item);
    } else {
      endTimeout.current = setTimeout(
        () => setPreviewState(null),
        PREVIEW_LINGER_MS,
      );
    }
  };

  return (
    <SetEquipmentPreviewContext value={setPreview}>
      <EquipmentPreviewContext value={preview}>
        {children}
      </EquipmentPreviewContext>
    </SetEquipmentPreviewContext>
  );
}
