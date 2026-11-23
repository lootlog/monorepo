import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { cn } from "cn";
import { COUNT_BADGE_CLASS_NAME } from "@/components/count-badge";
import { UnreadDot } from "@/components/unread-dot";
import { useTranslation } from "react-i18next";
import type { ChatFilter } from "@/store/chat.store";
import type { getChatUnreadSummary } from "../chat-read-state";

type Props = {
  value: ChatFilter;
  onValueChange: (value: ChatFilter) => void;
  unread: ReturnType<typeof getChatUnreadSummary>;
};

export function ChatFilterSwitcher({ value, onValueChange, unread }: Props) {
  const { t } = useTranslation("chat");

  const options = [
    { value: "all", unread: unread.ids.size > 0 },
    { value: "normal", unread: unread.conversations },
    { value: "reports", unread: unread.reports },
  ] as const;

  return (
    <div className="ll:-mt-px ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:border-y ll:border-x-0 ll:border-separator">
      <SegmentedControl<ChatFilter>
        value={value}
        onValueChange={onValueChange}
        aria-label={t("filters.label")}
        className="ll:flex-1"
      >
        {options.map((option) => (
          <SegmentedControlItem
            key={option.value}
            value={option.value}
            aria-label={t(`filters.${option.value}`)}
          >
            <span aria-hidden className="ll:size-2 ll:shrink-0" />
            {t(`filters.${option.value}`)}
            <UnreadDot
              aria-label={option.unread ? t("navigation.unread") : undefined}
              aria-hidden={!option.unread}
              className={cn(!option.unread && "ll:invisible")}
            />
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      {unread.attention > 0 && (
        <span
          className={cn(COUNT_BADGE_CLASS_NAME, "ll:mr-1")}
          title={t("navigation.attention")}
        >
          {unread.attention}
        </span>
      )}
    </div>
  );
}
