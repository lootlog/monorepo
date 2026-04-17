import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import type { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { Edit2, Trash2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ColorEditForm } from "./color-edit-form";
import { DEFAULT_COLOR_NAMES, type ColorEditData } from "./color-utils";

interface DefaultColorItemProps {
  colorId: string;
  displayName: string;
  overridden?: {
    borderColor: string;
    backgroundColor: string;
  };
  isEditing: boolean;
  editData: ColorEditData | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditDataChange: (data: ColorEditData) => void;
}

export const DefaultColorItem: FC<DefaultColorItemProps> = ({
  colorId,
  displayName,
  overridden,
  isEditing,
  editData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditDataChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ll:flex ll:items-center ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40">
      <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:h-full ll:min-w-0">
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
              {displayName || DEFAULT_COLOR_NAMES[colorId]}
            </span>
            <Tile
              color={
                overridden ? undefined : (colorId as keyof typeof TIMERS_COLORS)
              }
              customBorderColor={overridden?.borderColor}
              customBackgroundColor={overridden?.backgroundColor}
              className="ll:h-6 ll:w-full ll:items-center ll:justify-center"
            >
              <span className="ll:text-[10px] ll:text-white ll:whitespace-nowrap ll:flex ll:justify-between ll:w-full ll:px-1 ll:items-center ll:h-full">
                <span>{t("settings.common.preview.name")}</span>
                <span>{t("settings.common.preview.time")}</span>
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
