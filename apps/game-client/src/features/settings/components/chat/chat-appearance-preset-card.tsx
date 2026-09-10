import { Check } from "lucide-react";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
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
    className="ll-custom-cursor-pointer ll:group ll:relative ll:flex ll:min-w-0 ll:flex-col ll:gap-1 ll:rounded-sm ll:border-0 ll:bg-black/20 ll:p-2 ll:text-left ll:transition-colors ll:hover:bg-white/5 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:data-[selected=true]:bg-primary/15 ll:data-[selected=true]:shadow-[inset_0_0_0_1px_var(--color-primary)]"
    data-selected={selected}
    onClick={onSelect}
    type="button"
  >
    <span className="ll:flex ll:w-full ll:items-start ll:justify-between ll:gap-2">
      <span className="ll:text-[12px] ll:font-semibold ll:leading-4 ll:text-gray-100">
        {name}
      </span>
      <span
        className="ll:flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-primary ll:text-white ll:transition-opacity"
        data-visible={selected}
        style={{ opacity: selected ? 1 : 0 }}
      >
        <Check aria-hidden className="ll:size-3" />
      </span>
    </span>
    <span className="ll:line-clamp-2 ll:text-[10px] ll:leading-3.5 ll:text-muted-foreground">
      {description}
    </span>
    <ChatAppearancePresetMiniPreview
      npcTypeColors={npcTypeColors}
      settings={settings}
    />
  </button>
);
