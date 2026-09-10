import { EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChatGatheringMenu } from "./chat-gathering-menu";

export function ChatGatheringHideButton({
  pending,
  onHide,
}: {
  pending: boolean;
  onHide: () => void;
}) {
  const { t } = useTranslation("chat");
  const label = t("gatherings.hide");

  return (
    <ChatGatheringMenu>
      <Button
        type="button"
        variant="menu"
        aria-label={label}
        disabled={pending}
        onClick={onHide}
        className="ll:w-full ll:justify-start ll:gap-2"
      >
        <EyeOff size={16} aria-hidden />
        {label}
      </Button>
    </ChatGatheringMenu>
  );
}
