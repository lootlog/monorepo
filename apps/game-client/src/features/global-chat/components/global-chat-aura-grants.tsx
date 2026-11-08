import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGlobalChatControllerGetAuraGrants } from "@lootlog/client/main";
import { AsyncContent } from "@/components/async-content";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCharacterAuraRevoke } from "../hooks/use-global-chat-moderation";

/** An admin's list of Users granted an aura, each with a way to revoke it. */
export const GlobalChatAuraGrants = () => {
  const { t } = useTranslation("globalChat");
  const [open, setOpen] = useState(false);

  const grants = useGlobalChatControllerGetAuraGrants({
    query: { enabled: open },
  });

  const revoke = useCharacterAuraRevoke();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label={t("auraGrants.open")}>
          <Sparkles aria-hidden className="ll:size-3.5" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="ll:w-56 ll:p-2">
        <h2 className="ll:mt-0 ll:mb-1.5 ll:text-xs ll:font-semibold">
          {t("auraGrants.title")}
        </h2>
        <AsyncContent
          error={grants.error}
          errorLabel={t("auraGrants.loadError")}
          isLoading={grants.isPending}
          loadingLabel={t("states.loading")}
          onRetry={() => void grants.refetch()}
          retryLabel={t("actions.retry", { ns: "common" })}
        >
          {grants.data?.grants.length === 0 ? (
            <p className="ll:m-0 ll:text-xs ll:text-muted-foreground">
              {t("auraGrants.empty")}
            </p>
          ) : (
            <ScrollArea className="ll:max-h-48">
              <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-1 ll:p-0 ll:pr-2">
                {grants.data?.grants.map((grant) => (
                  <li
                    key={grant.id}
                    className="ll:flex ll:items-center ll:gap-1 ll:text-xs"
                  >
                    <span className="ll:min-w-0 ll:flex-1">
                      <span className="ll:block ll:truncate ll:font-semibold">
                        {grant.displayName}
                      </span>
                      <span className="ll:block ll:text-[11px] ll:text-muted-foreground">
                        {grant.auraId
                          ? t(`characterAura.auras.${grant.auraId}`, {
                              ns: "settings",
                            })
                          : t("auraGrants.noAura")}
                      </span>
                    </span>
                    <IconButton
                      label={t("auraGrants.revoke", {
                        name: grant.displayName,
                      })}
                      disabled={revoke.isPending}
                      onClick={() =>
                        revoke.mutate({ pathParams: { grantId: grant.id } })
                      }
                    >
                      <X aria-hidden className="ll:size-3.5" />
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
