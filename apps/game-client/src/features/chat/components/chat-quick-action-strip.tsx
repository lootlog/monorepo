import { MapPin, Siren } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useChatQuickActions } from "@/features/chat/hooks/use-chat-quick-actions";

export const ChatQuickActionStrip = ({ guildId }: { guildId?: string }) => {
  const { t } = useTranslation("chat");
  const { sendHelp, sendPosition, isPending } = useChatQuickActions();
  return (
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
      <Button
        type="button"
        className="ll:size-6 ll:p-0"
        disabled={!guildId || isPending}
        aria-label={t("quickActions.position")}
        title={t("quickActions.position")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void sendPosition(guildId)}
      >
        <MapPin aria-hidden className="ll:size-3.5" />
      </Button>
      <Button
        type="button"
        className="ll:size-6 ll:p-0"
        disabled={!guildId || isPending}
        aria-label={t("quickActions.help")}
        title={t("quickActions.help")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void sendHelp(guildId)}
      >
        <Siren aria-hidden className="ll:size-3.5" />
      </Button>
    </div>
  );
};
