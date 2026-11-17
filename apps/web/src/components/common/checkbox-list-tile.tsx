import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FormControl, FormItem } from "@lootlog/ui/components/form";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import {
  LIST_TILE_HOVER_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";

type CheckboxListTileProps = {
  checked: boolean;
  onCheckedChange: ComponentProps<typeof Checkbox>["onCheckedChange"];
  /** The rest of the tile; its `FormLabel` covers the tile, so the whole tile toggles. */
  children: ReactNode;
};

/** A checkbox form field as a tile of a tiled list, tinted while checked. */
export function CheckboxListTile({
  checked,
  onCheckedChange,
  children,
}: CheckboxListTileProps) {
  return (
    <FormItem
      data-list-tile
      className={cn(
        "relative flex flex-row items-center gap-3 py-3",
        LIST_TILE_HOVER_CLASS,
        LIST_TILE_RULE_CLASS,
        LIST_TILE_INSET_CLASS,
        checked && "bg-primary/5",
      )}
    >
      <FormControl
        render=<Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      />
      {children}
    </FormItem>
  );
}
