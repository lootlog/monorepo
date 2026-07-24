import { Check } from "lucide-react";
import type { ChatAppearanceSettings, NpcTypeColors } from "@lootlog/types";
import type { FC } from "react";
import { ChatAppearancePresetMiniPreview } from "./chat-appearance-preset-mini-preview";

type ChatAppearancePresetCardProps = {
  description: string;
  name: string;
  npcTypeColors: NpcTypeColors;
  onSelect: () => void;
  selected: boolean;
  settings: ChatAppearanceSettings;
};

export const ChatAppearancePresetCard: FC<ChatAppearancePresetCardProps> = ({
  description,
  name,
  npcTypeColors,
  onSelect,
  selected,
  settings,
}) => (
  <button
    aria-pressed={selected}
    className="ll:group ll:relative ll:flex ll:min-w-0 ll:flex-col ll:gap-1.5 ll:rounded-lg ll:border ll:bg-gray-900/70 ll:p-2 ll:text-left ll:transition-colors hover:ll:border-purple-400/70 hover:ll:bg-gray-900 focus-visible:ll:outline-none focus-visible:ll:ring-2 focus-visible:ll:ring-purple-400/70 data-[selected=true]:ll:border-purple-400 data-[selected=true]:ll:bg-purple-950/35"
    data-selected={selected}
    onClick={onSelect}
    type="button"
  >
    <span className="ll:flex ll:w-full ll:items-start ll:justify-between ll:gap-2">
      <span className="ll:text-sm ll:font-semibold ll:text-gray-100">
        {name}
      </span>
      <span
        className="ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-purple-500 ll:text-white ll:transition-opacity"
        data-visible={selected}
        style={{ opacity: selected ? 1 : 0 }}
      >
        <Check aria-hidden className="ll:size-3.5" />
      </span>
    </span>
    <span className="ll:line-clamp-2 ll:text-[10px] ll:leading-3.5 ll:text-gray-400">
      {description}
    </span>
    <ChatAppearancePresetMiniPreview
      npcTypeColors={npcTypeColors}
      settings={settings}
    />
  </button>
);
