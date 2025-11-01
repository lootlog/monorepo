import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tile } from "@/components/ui/tile";
import { Check, X } from "lucide-react";
import type { FC } from "react";
import {
  stripAlphaChannel,
  alphaToHex,
  type ColorEditData,
} from "./color-utils";

interface ColorEditFormProps {
  data: ColorEditData;
  onChange: (data: ColorEditData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const ColorEditForm: FC<ColorEditFormProps> = ({
  data,
  onChange,
  onSave,
  onCancel,
}) => {
  return (
    <>
      <div className="ll:flex ll:gap-1 ll:items-center ll:mb-1">
        <Input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="ll:h-5 ll:text-xs"
          placeholder="Nazwa"
        />
      </div>
      <div className="ll:grid ll:grid-cols-2 ll:gap-1 ll:mb-1">
        <Input
          type="color"
          value={stripAlphaChannel(data.borderColor)}
          onChange={(e) => onChange({ ...data, borderColor: e.target.value })}
          className="ll:h-5 ll:p-0"
        />
        <Input
          type="color"
          value={stripAlphaChannel(data.backgroundColor)}
          onChange={(e) =>
            onChange({ ...data, backgroundColor: e.target.value })
          }
          className="ll:h-5 ll:p-0"
        />
      </div>
      <div className="ll:flex ll:items-center ll:gap-1 ll:mb-1 ll:mt-2">
        <Slider
          min={0}
          max={100}
          step={1}
          value={[data.backgroundAlpha]}
          onValueChange={(value) =>
            onChange({ ...data, backgroundAlpha: value[0] })
          }
          className="ll:flex-1"
        />
        <span className="ll:text-[10px] ll:text-muted-foreground ll:w-7 ll:text-right">
          {data.backgroundAlpha}%
        </span>
      </div>
      <Tile
        customBorderColor={data.borderColor}
        customBackgroundColor={`${data.backgroundColor}${alphaToHex(data.backgroundAlpha)}`}
        className="ll:h-6 ll:w-full ll:items-center ll:justify-center ll:mb-2"
      >
        <span className="ll:text-[10px] ll:text-white ll:whitespace-nowrap ll:flex ll:justify-between ll:w-full ll:px-1 ll:items-center ll:h-full">
          <span>[T] Tanroth</span>
          <span> 00:21:37</span>
        </span>
      </Tile>
      <div className="ll:flex ll:gap-1">
        <Button onClick={onSave} className="ll:flex-1 ll:h-5 ll:text-xs">
          <Check className="ll:h-3 ll:w-3" />
        </Button>
        <Button onClick={onCancel} className="ll:flex-1 ll:h-5 ll:text-xs">
          <X className="ll:h-3 ll:w-3" />
        </Button>
      </div>
    </>
  );
};
