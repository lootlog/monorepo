import { ChatInput } from "./chat-input";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

export function ChatComposeArea({
  guildId,
  ownGathering,
}: {
  guildId: string;
  ownGathering: ReactNode;
}) {
  const { t } = useTranslation("chat");

  return (
    <div className="ll:shrink-0">
      {ownGathering}
      <div>
        {!guildId && (
          <p className="ll:text-[10px] ll:text-muted-foreground">
            {t("quickActions.selectOrganization")}
          </p>
        )}
        <ChatInput
          variant="borderless"
          selectedGuildId={guildId || undefined}
        />
      </div>
    </div>
  );
}
