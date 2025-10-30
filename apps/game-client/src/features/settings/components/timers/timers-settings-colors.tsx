import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tile } from "@/components/ui/tile";
import { useTimersStore, type CustomTimerColor } from "@/store/timers.store";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { Trash2, Edit2, Check, X, RotateCcw } from "lucide-react";
import { FC, useState } from "react";

const DEFAULT_COLOR_NAMES: Record<string, string> = {
  red: "Czerwony",
  orange: "Pomarańczowy",
  yellow: "Żółty",
  lime: "Limonkowy",
  green: "Zielony",
  teal: "Turkusowy",
  sky: "Niebieski",
  blue: "Granatowy",
  violet: "Fioletowy",
  purple: "Purpurowy",
  pink: "Różowy",
  white: "Biały",
};

const TAILWIND_TO_HEX: Record<string, { border: string; background: string }> =
  {
    red: { border: "#ef4444", background: "#ef444433" },
    orange: { border: "#f97316", background: "#f9731633" },
    yellow: { border: "#eab308", background: "#eab30833" },
    lime: { border: "#84cc16", background: "#84cc1633" },
    green: { border: "#22c55e", background: "#22c55e33" },
    teal: { border: "#14b8a6", background: "#14b8a633" },
    sky: { border: "#0ea5e9", background: "#0ea5e933" },
    blue: { border: "#3730a3", background: "#3730a333" },
    violet: { border: "#a78bfa", background: "#a78bfa33" },
    purple: { border: "#9333ea", background: "#9333ea33" },
    pink: { border: "#ec4899", background: "#ec489933" },
    white: { border: "#9ca3af", background: "#9ca3af33" },
  };

const stripAlphaChannel = (color: string): string => {
  const hex = color.replace("#", "");
  return hex.length === 8 ? `#${hex.slice(0, 6)}` : color;
};

export const TimersSettingsColors: FC = () => {
  const {
    customColors,
    addCustomColor,
    updateCustomColor,
    deleteCustomColor,
    defaultColorNames,
    setDefaultColorName,
    overriddenDefaultColors,
    updateDefaultColor,
    deleteDefaultColor,
    hiddenDefaultColors,
    restoreDefaultColor,
  } = useTimersStore();
  const [name, setName] = useState("");
  const [borderColor, setBorderColor] = useState("#3b82f6");
  const [backgroundColor, setBackgroundColor] = useState("#3b82f620");
  const [editingDefaultColor, setEditingDefaultColor] = useState<string | null>(
    null,
  );
  const [editingDefaultColorData, setEditingDefaultColorData] = useState<{
    name: string;
    borderColor: string;
    backgroundColor: string;
  } | null>(null);
  const [editingCustomColor, setEditingCustomColor] = useState<string | null>(
    null,
  );
  const [editingCustomColorData, setEditingCustomColorData] = useState<{
    name: string;
    borderColor: string;
    backgroundColor: string;
  } | null>(null);

  const handleAddColor = () => {
    if (!name.trim()) return;

    const newColor: CustomTimerColor = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      borderColor,
      backgroundColor,
    };

    addCustomColor(newColor);
    setName("");
    setBorderColor("#3b82f6");
    setBackgroundColor("#3b82f620");
  };

  const handleDeleteCustomColor = (id: string) => {
    deleteCustomColor(id);
  };

  const handleEditDefaultColor = (colorId: string) => {
    const overridden = overriddenDefaultColors[colorId];
    const defaultColors = TAILWIND_TO_HEX[colorId] || {
      border: "#3b82f6",
      background: "#3b82f620",
    };

    setEditingDefaultColor(colorId);
    setEditingDefaultColorData({
      name: defaultColorNames[colorId] || DEFAULT_COLOR_NAMES[colorId] || "",
      borderColor: overridden?.borderColor || defaultColors.border,
      backgroundColor: overridden?.backgroundColor || defaultColors.background,
    });
  };

  const handleSaveDefaultColor = (colorId: string) => {
    if (editingDefaultColorData) {
      if (editingDefaultColorData.name.trim()) {
        setDefaultColorName(colorId, editingDefaultColorData.name.trim());
      }
      updateDefaultColor(
        colorId,
        editingDefaultColorData.borderColor,
        editingDefaultColorData.backgroundColor,
      );
    }
    setEditingDefaultColor(null);
    setEditingDefaultColorData(null);
  };

  const handleCancelEditDefaultColor = () => {
    setEditingDefaultColor(null);
    setEditingDefaultColorData(null);
  };

  const handleDeleteDefaultColor = (colorId: string) => {
    deleteDefaultColor(colorId);
  };

  const handleRestoreDefaultColor = (colorId: string) => {
    restoreDefaultColor(colorId);
  };

  const handleEditCustomColor = (color: CustomTimerColor) => {
    setEditingCustomColor(color.id);
    setEditingCustomColorData({
      name: color.name,
      borderColor: color.borderColor,
      backgroundColor: color.backgroundColor,
    });
  };

  const handleSaveCustomColor = (colorId: string) => {
    if (editingCustomColorData && editingCustomColorData.name.trim()) {
      updateCustomColor(colorId, {
        id: colorId,
        name: editingCustomColorData.name.trim(),
        borderColor: editingCustomColorData.borderColor,
        backgroundColor: editingCustomColorData.backgroundColor,
      });
    }
    setEditingCustomColor(null);
    setEditingCustomColorData(null);
  };

  const handleCancelEditCustomColor = () => {
    setEditingCustomColor(null);
    setEditingCustomColorData(null);
  };

  const visibleDefaultColors = Object.entries(TIMERS_COLORS).filter(
    ([colorId]) => !hiddenDefaultColors.includes(colorId),
  );

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <div className="ll:flex ll:flex-col ll:gap-2">
        <h3 className="ll:text-sm ll:font-semibold">Lista kolorów</h3>
        <div className="ll:grid ll:grid-cols-2 ll:gap-1.5">
          {visibleDefaultColors.map(([colorId, colorData]) => {
            const overridden = overriddenDefaultColors[colorId];

            return (
              <div
                key={colorId}
                className="ll:flex ll:items-center ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40"
              >
                <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between  ll:h-full ll:min-w-0">
                  {editingDefaultColor === colorId ? (
                    <>
                      <div className="ll:flex ll:gap-1 ll:items-center ll:mb-1">
                        <Input
                          value={editingDefaultColorData?.name || ""}
                          onChange={(e) =>
                            setEditingDefaultColorData((prev) =>
                              prev ? { ...prev, name: e.target.value } : null,
                            )
                          }
                          className="ll:h-5 ll:text-xs"
                          placeholder="Nazwa"
                        />
                      </div>
                      <div className="ll:grid ll:grid-cols-2 ll:gap-1 ll:mb-1">
                        <Input
                          type="color"
                          value={stripAlphaChannel(
                            editingDefaultColorData?.borderColor || "#3b82f6",
                          )}
                          onChange={(e) =>
                            setEditingDefaultColorData((prev) =>
                              prev
                                ? { ...prev, borderColor: e.target.value }
                                : null,
                            )
                          }
                          className="ll:h-5 ll:p-0"
                        />
                        <Input
                          type="color"
                          value={stripAlphaChannel(
                            editingDefaultColorData?.backgroundColor ||
                              "#3b82f620",
                          )}
                          onChange={(e) =>
                            setEditingDefaultColorData((prev) =>
                              prev
                                ? { ...prev, backgroundColor: e.target.value }
                                : null,
                            )
                          }
                          className="ll:h-5 ll:p-0"
                        />
                      </div>
                      <Tile
                        customBorderColor={editingDefaultColorData?.borderColor}
                        customBackgroundColor={
                          editingDefaultColorData?.backgroundColor
                        }
                        className="ll:h-6 ll:mb-1"
                      >
                        <span className="ll:text-[10px] ll:text-white">
                          [T] Tanroth 00:21:37
                        </span>
                      </Tile>
                      <div className="ll:flex ll:gap-1">
                        <Button
                          onClick={() => handleSaveDefaultColor(colorId)}
                          className="ll:flex-1 ll:h-5 ll:text-xs"
                        >
                          <Check className="ll:h-3 ll:w-3" />
                        </Button>
                        <Button
                          onClick={handleCancelEditDefaultColor}
                          className="ll:flex-1 ll:h-5 ll:text-xs"
                        >
                          <X className="ll:h-3 ll:w-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="ll:text-xs ll:font-medium ll:truncate ll:h-full ll:flex ll:items-center">
                        {defaultColorNames[colorId] ||
                          DEFAULT_COLOR_NAMES[colorId]}
                      </span>
                      <Tile
                        color={
                          overridden
                            ? undefined
                            : (colorId as keyof typeof TIMERS_COLORS)
                        }
                        customBorderColor={overridden?.borderColor}
                        customBackgroundColor={overridden?.backgroundColor}
                        className="ll:h-6"
                      >
                        <span className="ll:text-[10px] ll:text-white">
                          [T] Tanroth 00:21:37
                        </span>
                      </Tile>
                    </>
                  )}
                </div>
                {editingDefaultColor !== colorId && (
                  <div className="ll:flex ll:flex-col ll:gap-1">
                    <Button
                      onClick={() => handleEditDefaultColor(colorId)}
                      className="ll:w-6 ll:h-6 ll:p-0 ll:min-w-6"
                    >
                      <Edit2 className="ll:h-2.5 ll:w-2.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteDefaultColor(colorId)}
                      className="ll:bg-red-500/30 ll:hover:bg-red-500/50 ll:border-red-500 ll:w-6 ll:h-6 ll:p-0 ll:min-w-6"
                    >
                      <Trash2 className="ll:h-3 ll:w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {Object.values(customColors).map((color) => (
            <div
              key={color.id}
              className="ll:flex ll:items-center ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40"
            >
              <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:min-w-0 ll:h-full">
                {editingCustomColor === color.id ? (
                  <>
                    <div className="ll:flex ll:gap-1 ll:items-center ll:mb-1">
                      <Input
                        value={editingCustomColorData?.name || ""}
                        onChange={(e) =>
                          setEditingCustomColorData((prev) =>
                            prev ? { ...prev, name: e.target.value } : null,
                          )
                        }
                        className="ll:h-5 ll:text-xs"
                        placeholder="Nazwa"
                      />
                    </div>
                    <div className="ll:grid ll:grid-cols-2 ll:gap-1 ll:mb-1">
                      <Input
                        type="color"
                        value={stripAlphaChannel(
                          editingCustomColorData?.borderColor || "#3b82f6",
                        )}
                        onChange={(e) =>
                          setEditingCustomColorData((prev) =>
                            prev
                              ? { ...prev, borderColor: e.target.value }
                              : null,
                          )
                        }
                        className="ll:h-5 ll:p-0"
                      />
                      <Input
                        type="color"
                        value={stripAlphaChannel(
                          editingCustomColorData?.backgroundColor ||
                            "#3b82f620",
                        )}
                        onChange={(e) =>
                          setEditingCustomColorData((prev) =>
                            prev
                              ? { ...prev, backgroundColor: e.target.value }
                              : null,
                          )
                        }
                        className="ll:h-5 ll:p-0"
                      />
                    </div>
                    <Tile
                      customBorderColor={editingCustomColorData?.borderColor}
                      customBackgroundColor={
                        editingCustomColorData?.backgroundColor
                      }
                      className="ll:h-6 ll:mb-1"
                    >
                      <span className="ll:text-[10px] ll:text-white">
                        [T] Tanroth 00:21:37
                      </span>
                    </Tile>
                    <div className="ll:flex ll:gap-1">
                      <Button
                        onClick={() => handleSaveCustomColor(color.id)}
                        className="ll:flex-1 ll:h-5 ll:text-xs"
                      >
                        <Check className="ll:h-3 ll:w-3" />
                      </Button>
                      <Button
                        onClick={handleCancelEditCustomColor}
                        className="ll:flex-1 ll:h-5 ll:text-xs"
                      >
                        <X className="ll:h-3 ll:w-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="ll:text-xs ll:font-medium ll:truncate ll:h-full ll:flex ll:items-center">
                      {color.name}
                    </span>
                    <Tile
                      customBorderColor={color.borderColor}
                      customBackgroundColor={color.backgroundColor}
                      className="ll:h-6"
                    >
                      <span className="ll:text-[10px] ll:text-white">
                        [T] Tanroth 00:21:37
                      </span>
                    </Tile>
                  </>
                )}
              </div>
              {editingCustomColor !== color.id && (
                <div className="ll:flex ll:flex-col ll:gap-1">
                  <Button
                    onClick={() => handleEditCustomColor(color)}
                    className="ll:w-6 ll:h-6 ll:p-0 ll:min-w-6"
                  >
                    <Edit2 className="ll:h-2.5 ll:w-2.5" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteCustomColor(color.id)}
                    className="ll:bg-red-500/30 ll:hover:bg-red-500/50 ll:border-red-500 ll:w-6 ll:h-6 ll:p-0 ll:min-w-6"
                  >
                    <Trash2 className="ll:h-3 ll:w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="ll:flex ll:flex-col ll:gap-2 ll:pt-2 ll:border-t ll:border-gray-600">
        <h3 className="ll:text-sm ll:font-semibold">Dodaj nowy kolor</h3>

        <div className="ll:flex ll:flex-col ll:gap-1.5">
          <Label htmlFor="color-name" className="ll:text-xs">
            Nazwa
          </Label>
          <Input
            id="color-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Mój kolor"
            className="ll:h-7"
          />
        </div>

        <div className="ll:grid ll:grid-cols-2 ll:gap-2">
          <div className="ll:flex ll:flex-col ll:gap-1.5">
            <Label htmlFor="border-color" className="ll:text-xs">
              Ramka
            </Label>
            <Input
              id="border-color"
              type="color"
              value={stripAlphaChannel(borderColor)}
              onChange={(e) => setBorderColor(e.target.value)}
              className="ll:h-7 ll:p-0"
            />
          </div>

          <div className="ll:flex ll:flex-col ll:gap-1.5">
            <Label htmlFor="bg-color" className="ll:text-xs">
              Tło
            </Label>
            <Input
              id="bg-color"
              type="color"
              value={stripAlphaChannel(backgroundColor)}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="ll:h-7 ll:p-0"
            />
          </div>
        </div>

        <div className="ll:flex ll:flex-col ll:gap-1.5">
          <Label className="ll:text-xs">Podgląd</Label>
          <Tile
            customBorderColor={borderColor}
            customBackgroundColor={backgroundColor}
            className="ll:h-6"
          >
            <span className="ll:text-[10px] ll:text-white">
              [T] Tanroth 00:21:37
            </span>
          </Tile>
        </div>

        <Button
          onClick={handleAddColor}
          disabled={!name.trim()}
          className="ll:h-6 ll:text-xs"
        >
          Dodaj
        </Button>
      </div>

      {hiddenDefaultColors.length > 0 && (
        <div className="ll:flex ll:flex-col ll:gap-2 ll:pt-2 ll:border-t ll:border-gray-600">
          <h3 className="ll:text-sm ll:font-semibold">
            Usunięte domyślne kolory
          </h3>
          <div className="ll:grid ll:grid-cols-2 ll:gap-1.5">
            {hiddenDefaultColors.map((colorId) => (
              <div
                key={colorId}
                className="ll:flex ll:items-center ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40 ll:opacity-60"
              >
                <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:h-full">
                  <span className="ll:text-xs ll:font-medium ll:truncate">
                    {defaultColorNames[colorId] || DEFAULT_COLOR_NAMES[colorId]}
                  </span>
                  <Tile
                    color={colorId as keyof typeof TIMERS_COLORS}
                    className="ll:h-6"
                  >
                    <span className="ll:text-[10px] ll:text-white">
                      [T] Tanroth 00:21:37
                    </span>
                  </Tile>
                </div>
                <Button
                  onClick={() => handleRestoreDefaultColor(colorId)}
                  className="ll:w-6 ll:h-6 ll:p-0 ll:min-w-6 ll:bg-green-500/30 ll:hover:bg-green-500/50 ll:border-green-500"
                  title="Przywróć kolor"
                >
                  <RotateCcw className="ll:h-3 ll:w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
