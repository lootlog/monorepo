import { UserX, Volume2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGlobalChatControllerGetMutes } from "@lootlog/client/main";
import { AsyncContent } from "@/components/async-content";
import { format } from "@/utils/local-date";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGlobalChatUnmute } from "../hooks/use-global-chat-moderation";

/** An admin's list of muted senders, each with a way to lift the mute. */
export const GlobalChatMutes = () => {
  const { t } = useTranslation("globalChat");
  const [open, setOpen] = useState(false);
  const mutes = useGlobalChatControllerGetMutes({ query: { enabled: open } });
  const unmute = useGlobalChatUnmute();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label={t("mutes.open")}>
          <UserX aria-hidden className="ll:size-3.5" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="ll:w-56 ll:p-2">
        <h2 className="ll:mt-0 ll:mb-1.5 ll:text-xs ll:font-semibold">
          {t("mutes.title")}
        </h2>
        <AsyncContent
          error={mutes.error}
          errorLabel={t("mutes.loadError")}
          isLoading={mutes.isPending}
          loadingLabel={t("states.loading")}
          onRetry={() => void mutes.refetch()}
          retryLabel={t("actions.retry", { ns: "common" })}
        >
          {mutes.data?.mutes.length === 0 ? (
            <p className="ll:m-0 ll:text-xs ll:text-muted-foreground">
              {t("mutes.empty")}
            </p>
          ) : (
            <ScrollArea className="ll:max-h-48">
              <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-1 ll:p-0 ll:pr-2">
                {mutes.data?.mutes.map((mute) => (
                  <li
                    key={mute.id}
                    className="ll:flex ll:items-center ll:gap-1 ll:text-xs"
                  >
                    <span className="ll:min-w-0 ll:flex-1">
                      <span className="ll:block ll:truncate ll:font-semibold">
                        {mute.displayName}
                      </span>
                      <span className="ll:block ll:text-[11px] ll:text-muted-foreground">
                        {mute.mutedUntil
                          ? t("mutes.until", {
                              date: format(
                                new Date(mute.mutedUntil),
                                "dd.MM.yyyy HH:mm",
                              ),
                            })
                          : t("mutes.permanent")}
                      </span>
                    </span>
                    <IconButton
                      label={t("mutes.unmute", { name: mute.displayName })}
                      disabled={unmute.isPending}
                      onClick={() =>
                        unmute.mutate({ pathParams: { muteId: mute.id } })
                      }
                    >
                      <Volume2 aria-hidden className="ll:size-3.5" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </AsyncContent>
      </PopoverContent>
    </Popover>
  );
};
