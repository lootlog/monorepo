import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tile } from "@/components/ui/tile";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const bgWithAlpha = `${backgroundColor}${alphaToHex(backgroundAlpha)}`;

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), borderColor, backgroundColor: bgWithAlpha });
    setName("");
    setBorderColor("#3b82f6");
    setBackgroundColor("#3b82f6");
    setBackgroundAlpha(20);
  };

  return (
    <div className="ll:pt-2 ll:border-t ll:border-gray-600 ll:space-y-2">
      <h3 className="ll:text-sm ll:font-semibold">
        {t("settings.timers.colors.addTitle")}
      </h3>

      <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-2">
        <div className="ll:flex ll:gap-4 ll:items-center">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings.timers.colors.namePlaceholder")}
            className="ll:text-xs ll:flex-1"
          />
          <div className="ll:flex ll:items-center ll:gap-1">
            <Label className="ll:text-[11px]">
              {t("settings.timers.colors.borderLabel")}
            </Label>
            <Input
              type="color"
              value={stripAlphaChannel(borderColor)}
              onChange={(e) => setBorderColor(e.target.value)}
              className="ll:h-8 ll:w-8 ll:p-0 ll:border-0 ll:bg-transparent"
              aria-label={t("settings.timers.colors.borderAria")}
            />
          </div>

          <div className="ll:flex ll:items-center ll:gap-1">
            <Label className="ll:text-[11px]">
              {t("settings.timers.colors.backgroundLabel")}
            </Label>
            <Input
              type="color"
              value={stripAlphaChannel(backgroundColor)}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="ll:h-8 ll:w-8 ll:p-0 ll:border-0 ll:bg-transparent"
              aria-label={t("settings.timers.colors.backgroundAria")}
            />
          </div>
        </div>

        <div className="ll:flex ll:gap-1 ll:flex-col ll:w-full">
          <Label className="ll:text-[11px]">
            {t("settings.timers.colors.transparencyLabel")}
          </Label>
          <div className="ll:flex ll:gap-4">
            <div className="ll:w-full">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[backgroundAlpha]}
                onValueChange={(v) => setBackgroundAlpha(v[0])}
                className="ll:h-6"
                aria-label={t("settings.timers.colors.transparencyAria")}
              />
            </div>
            <div className="ll:flex ll:items-center ll:gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={backgroundAlpha}
                onChange={(e) =>
                  setBackgroundAlpha(
                    Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  )
                }
                className="ll:w-12"
              />
              <span className="ll:text-muted-foreground ll:text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="ll:grid ll:grid-cols-2 ll:items-end ll:w-full ll:gap-4">
          <div className="ll:gap-1 ll:flex ll:flex-col">
            <Label className="ll:text-[11px]">
              {t("settings.timers.colors.previewLabel")}
            </Label>

            <Tile
              customBorderColor={borderColor}
              customBackgroundColor={bgWithAlpha}
              className="ll:h-6 ll:w-full ll:items-center ll:justify-center"
            >
              <span className="ll:text-[10px] ll:text-white ll:whitespace-nowrap ll:flex ll:justify-between ll:w-full ll:px-1 ll:items-center ll:h-full ll:mt-1">
                <span>{t("settings.common.preview.name")}</span>
                <span>{t("settings.common.preview.time")}</span>
              </span>
            </Tile>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="ll:h-6 ll:w-full"
          >
            {t("settings.timers.colors.addButton")}
          </Button>
        </div>
      </div>
    </div>
  );
};
