import { useOnlinePlayersGlowStore } from "@/addons/extensions/online-players-glow/online-players-glow.store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FC } from "react";

export const OnlinePlayersGlowSettings: FC = () => {
  const lootlogGlowEnabled = useOnlinePlayersGlowStore(
    (s) => s.lootlogGlowEnabled,
  );
  const lootlogGlowColor = useOnlinePlayersGlowStore((s) => s.lootlogGlowColor);
  const nonLootlogGlowEnabled = useOnlinePlayersGlowStore(
    (s) => s.nonLootlogGlowEnabled,
  );
  const nonLootlogGlowColor = useOnlinePlayersGlowStore(
    (s) => s.nonLootlogGlowColor,
  );
  const setLootlogGlowEnabled = useOnlinePlayersGlowStore(
    (s) => s.setLootlogGlowEnabled,
  );
  const setLootlogGlowColor = useOnlinePlayersGlowStore(
    (s) => s.setLootlogGlowColor,
  );
  const setNonLootlogGlowEnabled = useOnlinePlayersGlowStore(
    (s) => s.setNonLootlogGlowEnabled,
  );
  const setNonLootlogGlowColor = useOnlinePlayersGlowStore(
    (s) => s.setNonLootlogGlowColor,
  );

  return (
    <div className="ll:mt-6 ll:border-t ll:border-gray-700 ll:pt-4 ll:flex ll:flex-col ll:gap-4">
      <div>
        <h3 className="ll:text-sm ll:font-semibold">
          Podświetlenie graczy online
        </h3>
        <p className="ll:text-gray-400 ll:text-xs">
          Zarządzaj glow graczy z Lootlog i bez Lootlog.
        </p>
      </div>

      <div className="ll:flex ll:flex-col ll:gap-2">
        <div className="ll:flex ll:items-center ll:justify-between ll:gap-3">
          <div>
            <Label htmlFor="lootlog-glow-enabled">Glow graczy z Lootloga</Label>
            <p className="ll:text-muted-foreground ll:text-xs">
              Włącza podświetlenie graczy korzystających z Lootloga.
            </p>
          </div>
          <Switch
            id="lootlog-glow-enabled"
            checked={lootlogGlowEnabled}
            onCheckedChange={setLootlogGlowEnabled}
          />
        </div>
        <div className="ll:flex ll:items-center ll:gap-2 ll:max-w-48">
          <Label
            htmlFor="lootlog-glow-color"
            className="ll:text-xs ll:shrink-0"
          >
            Kolor
          </Label>
          <Input
            id="lootlog-glow-color"
            type="color"
            value={lootlogGlowColor}
            onChange={(event) => setLootlogGlowColor(event.target.value)}
            className="ll:h-7 ll:p-0"
          />
        </div>
      </div>

      <div className="ll:flex ll:flex-col ll:gap-2">
        <div className="ll:flex ll:items-center ll:justify-between ll:gap-3">
          <div>
            <Label htmlFor="non-lootlog-glow-enabled">
              Glow graczy bez Lootloga
            </Label>
            <p className="ll:text-muted-foreground ll:text-xs">
              Włącza podświetlenie graczy, którzy nie używają Lootloga.
            </p>
          </div>
          <Switch
            id="non-lootlog-glow-enabled"
            checked={nonLootlogGlowEnabled}
            onCheckedChange={setNonLootlogGlowEnabled}
          />
        </div>
        <div className="ll:flex ll:items-center ll:gap-2 ll:max-w-48">
          <Label
            htmlFor="non-lootlog-glow-color"
            className="ll:text-xs ll:shrink-0"
          >
            Kolor
          </Label>
          <Input
            id="non-lootlog-glow-color"
            type="color"
            value={nonLootlogGlowColor}
            onChange={(event) => setNonLootlogGlowColor(event.target.value)}
            className="ll:h-7 ll:p-0"
          />
        </div>
      </div>
    </div>
  );
};
