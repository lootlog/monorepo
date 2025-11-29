import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import type { CustomTimerColor } from "@lootlog/types";
import { Edit2, Trash2 } from "lucide-react";
import type { FC } from "react";
import { ColorEditForm } from "./color-edit-form";
import type { ColorEditData } from "./color-utils";

interface CustomColorItemProps {
  color: CustomTimerColor;
  isEditing: boolean;
  editData: ColorEditData | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditDataChange: (data: ColorEditData) => void;
}

export const CustomColorItem: FC<CustomColorItemProps> = ({
  color,
  isEditing,
  editData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditDataChange,
}) => {
  return (
    <div className="ll:flex ll:items-center ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40">
      <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:min-w-0 ll:h-full">
        {isEditing && editData ? (
          <ColorEditForm
            data={editData}
            onChange={onEditDataChange}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <>
            <span className="ll:text-xs ll:font-medium ll:truncate ll:h-full ll:flex ll:items-center">
              {color.name}
            </span>
            <Tile
              customBorderColor={color.borderColor}
              customBackgroundColor={color.backgroundColor}
              className="ll:h-6 ll:w-full ll:items-center ll:justify-center"
            >
              <span className="ll:text-[10px] ll:text-white ll:whitespace-nowrap ll:flex ll:justify-between ll:w-full ll:px-1 ll:items-center ll:h-full">
                <span>[T] Tanroth</span>
                <span> 00:21:37</span>
              </span>
            </Tile>
          </>
        )}
      </div>
      {!isEditing && (
        <div className="ll:flex ll:flex-col ll:gap-1">
          <Button onClick={onEdit} className="ll:w-6 ll:h-6 ll:p-0 ll:min-w-6">
            <Edit2 className="ll:h-2.5 ll:w-2.5" />
          </Button>
          <Button
            onClick={onDelete}
            className="ll:bg-red-500/30 ll:hover:bg-red-500/50 ll:border-red-500 ll:w-6 ll:h-6 ll:p-0 ll:min-w-6"
          >
            <Trash2 className="ll:h-3 ll:w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
