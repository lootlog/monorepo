import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { cn } from "cn";
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
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:border-solid ll:border-y ll:border-x-0 ll:border-gray-400/40">
      <ToggleGroup
        value={[value]}
        onValueChange={(values) => {
          const option = options.find((item) => item.value === values[0]);
          if (option) onValueChange(option.value);
        }}
        aria-label={t("filters.label")}
        className="ll:grid ll:grid-cols-3 ll:min-w-0 ll:flex-1 ll:h-7 ll:box-border ll:rounded-none ll:border-0 ll:bg-black/20 ll:p-0"
      >
        {options.map((option) => (
          <Toggle
            key={option.value}
            value={option.value}
            aria-label={t(`filters.${option.value}`)}
            className={cn(
              "ll:relative ll:flex ll:min-w-0 ll:h-full ll:items-center ll:justify-center ll:gap-1 ll:rounded-none ll:border-0 ll:px-1 ll:py-0 ll:text-[11px] ll:leading-none ll:font-semibold ll:cursor-pointer ll:transition-none ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:focus-visible:-outline-offset-2",
              value === option.value
                ? "ll:bg-white/10 ll:text-gray-100"
                : "ll:bg-transparent ll:text-muted-foreground ll:hover:bg-white/5",
            )}
          >
            <span aria-hidden className="ll:size-1.5 ll:shrink-0" />
            {t(`filters.${option.value}`)}
            <span
              aria-label={option.unread ? t("navigation.unread") : undefined}
              aria-hidden={!option.unread}
              className={cn(
                "ll:size-1.5 ll:shrink-0 ll:rounded-full ll:bg-primary",
                !option.unread && "ll:invisible",
              )}
            />
          </Toggle>
        ))}
      </ToggleGroup>
      {unread.attention > 0 && (
        <span
          className="ll:rounded ll:bg-primary/20 ll:px-1 ll:text-xs ll:font-semibold"
          title={t("navigation.attention")}
        >
          {unread.attention}
        </span>
      )}
    </div>
  );
}
