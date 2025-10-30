import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tile } from "@/components/ui/tile";
import { FC, useState } from "react";
import { stripAlphaChannel, alphaToHex } from "./color-utils";

interface AddColorFormProps {
  onAdd: (data: {
    name: string;
    borderColor: string;
    backgroundColor: string;
  }) => void;
}

export const AddColorForm: FC<AddColorFormProps> = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [borderColor, setBorderColor] = useState("#3b82f6");
  const [backgroundColor, setBackgroundColor] = useState("#3b82f6");
  const [backgroundAlpha, setBackgroundAlpha] = useState(20);

  const handleAdd = () => {
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      borderColor,
      backgroundColor: `${backgroundColor}${alphaToHex(backgroundAlpha)}`,
    });

    setName("");
    setBorderColor("#3b82f6");
    setBackgroundColor("#3b82f6");
    setBackgroundAlpha(20);
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:pt-2 ll:border-t ll:border-gray-600">
      <h3 className="ll:text-sm ll:font-semibold">Dodaj nowy kolor</h3>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa koloru"
      />
      <div className="ll:grid ll:grid-cols-2 ll:gap-2">
        <div className="ll:flex ll:flex-col ll:gap-1">
          <Label className="ll:text-xs">Ramka</Label>
          <Input
            type="color"
            value={stripAlphaChannel(borderColor)}
            onChange={(e) => setBorderColor(e.target.value)}
            className="ll:h-7 ll:p-0"
          />
        </div>
        <div className="ll:flex ll:flex-col ll:gap-1">
          <Label className="ll:text-xs">Tło</Label>
          <Input
            type="color"
            value={stripAlphaChannel(backgroundColor)}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="ll:h-7 ll:p-0"
          />
        </div>
      </div>
      <div className="ll:flex ll:flex-col ll:gap-1">
        <div className="ll:flex ll:items-center ll:justify-between">
          <Label className="ll:text-xs">Przezroczystość tła</Label>
          <span className="ll:text-xs ll:text-muted-foreground">
            {backgroundAlpha}%
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[backgroundAlpha]}
          onValueChange={(value) => setBackgroundAlpha(value[0])}
        />
      </div>
      <div className="ll:flex ll:flex-col ll:gap-1">
        <Label className="ll:text-xs">Podgląd</Label>
        <Tile
          customBorderColor={borderColor}
          customBackgroundColor={`${backgroundColor}${alphaToHex(backgroundAlpha)}`}
          className="ll:h-6"
        >
          <span className="ll:text-[10px] ll:text-white">
            [T] Tanroth 00:21:37
          </span>
        </Tile>
      </div>
      <Button
        onClick={handleAdd}
        disabled={!name.trim()}
        className="ll:h-7 ll:text-xs"
      >
        Dodaj
      </Button>
    </div>
  );
};
