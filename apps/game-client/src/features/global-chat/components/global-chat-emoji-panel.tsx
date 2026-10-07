import {
  Apple,
  Car,
  Clock,
  Flag,
  Heart,
  Lightbulb,
  PawPrint,
  Smile,
  Volleyball,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useGlobalChatStore } from "@/store/global-chat.store";
import { getGlobalChatEmojiCategories } from "../global-chat-emoji";
import type { GlobalChatEmojiCategoryId } from "../global-chat-emoji.data";

type SectionId = GlobalChatEmojiCategoryId | "recent";

const COLUMNS = 8;

const ICONS: Record<SectionId, LucideIcon> = {
  recent: Clock,
  smileys: Smile,
  nature: PawPrint,
  food: Apple,
  activities: Volleyball,
  travel: Car,
  objects: Lightbulb,
  symbols: Heart,
  flags: Flag,
};

const ARROW_STEPS = new Map([
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
  ["ArrowUp", -COLUMNS],
  ["ArrowDown", COLUMNS],
]);

/** Arrows move between emoji; Tab moves between categories. */
const moveEmojiFocus = (event: KeyboardEvent<HTMLDivElement>) => {
  const step = ARROW_STEPS.get(event.key);

  if (step === undefined) return;

  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-emoji]"),
  ];

  const index = buttons.findIndex((button) => button === event.target);

  if (index === -1) return;
  event.preventDefault();
  buttons[index + step]?.focus();
};

type GlobalChatEmojiPanelProps = {
  onPick: (emoji: string) => void;
};

/**
 * Every emoji the system draws, by category, with the recently used first and
 * a category bar to jump between them.
 */
export const GlobalChatEmojiPanel = ({ onPick }: GlobalChatEmojiPanelProps) => {
  const { t } = useTranslation("globalChat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const addRecentEmoji = useGlobalChatStore((state) => state.addRecentEmoji);
  // Read once, so picking does not shift the grid under the pointer.
  const [recent] = useState(() => useGlobalChatStore.getState().recentEmoji);

  const sections: { id: SectionId; emoji: string[] }[] = [
    ...(recent.length > 0 ? [{ id: "recent" as const, emoji: recent }] : []),
    ...getGlobalChatEmojiCategories(),
  ];

  const [activeId, setActiveId] = useState(sections[0]?.id);

  // In the order of `sections`.
  const sectionElements = () => [
    ...(scrollRef.current?.querySelectorAll<HTMLElement>("[data-section]") ??
      []),
  ];

  const jumpTo = (index: number) => {
    const section = sectionElements()[index];

    if (!scrollRef.current || !section) return;
    scrollRef.current.scrollTop = section.offsetTop;
    setActiveId(sections[index]?.id);
  };

  const trackActiveSection = () => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;

    const index = sectionElements().findLastIndex(
      (element) => element.offsetTop <= scrollTop + 1,
    );

    if (index !== -1) setActiveId(sections[index]?.id);
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <div
        ref={scrollRef}
        className="ll:relative ll:h-56 ll:overflow-y-auto ll:overscroll-contain"
        onScroll={trackActiveSection}
        onKeyDown={moveEmojiFocus}
      >
        {sections.map(({ id, emoji }) => (
          <section
            key={id}
            data-section
            aria-labelledby={`ll-global-chat-emoji-${id}`}
          >
            <h3
              id={`ll-global-chat-emoji-${id}`}
              className="ll:sticky ll:top-0 ll:z-10 ll:m-0 ll:bg-black ll:px-1 ll:py-0.5 ll:text-[10px] ll:font-semibold ll:text-gray-400"
            >
              {t(`emoji.categories.${id}`)}
            </h3>
            <div className="ll:grid ll:grid-cols-8 ll:gap-0.5">
              {emoji.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  data-emoji
                  tabIndex={index === 0 ? 0 : -1}
                  className="ll:flex ll:size-7 ll:scroll-mt-5 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:text-base ll:leading-none ll:hover:bg-white/10 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll-custom-cursor-pointer"
                  onClick={() => {
                    onPick(item);
                    addRecentEmoji(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div
        role="group"
        aria-label={t("emoji.categoriesLabel")}
        className="ll:flex ll:justify-between ll:border-0 ll:border-t ll:border-solid ll:border-white/20 ll:pt-1"
      >
        {sections.map(({ id }, index) => {
          const Icon = ICONS[id];

          return (
            <IconButton
              key={id}
              label={t(`emoji.categories.${id}`)}
              active={activeId === id}
              onClick={() => jumpTo(index)}
            >
              <Icon aria-hidden className="ll:size-3.5" />
            </IconButton>
          );
        })}
      </div>
    </div>
  );
};
