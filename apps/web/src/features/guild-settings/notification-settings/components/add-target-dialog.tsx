import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useDiscordChannels } from "@/hooks/api/notifications/use-discord-channels";
import { useCreateNotificationTarget } from "@/hooks/api/notifications/use-notification-targets";
import { useBotStatus } from "@/hooks/api/notifications/use-bot-status";
import { DISCORD_BOT_PERMISSIONS, DISCORD_CLIENT_ID } from "@/config/discord";

interface AddTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: "guild" | "user";
  ownerId: string;
}

export const AddTargetDialog = ({
  open,
  onOpenChange,
  ownerType,
  ownerId,
}: AddTargetDialogProps) => {
  const { t } = useTranslation();
  const { data: channels, isPending: channelsLoading } =
    useDiscordChannels(ownerId);
  const { data: botStatus } = useBotStatus(
    ownerType === "guild" ? ownerId : undefined,
  );
  const createTarget = useCreateNotificationTarget();
  const [selectedChannel, setSelectedChannel] = useState<string>("");

  const cannotSendMessages =
    botStatus && !botStatus.canSendChannelMessages;

  const handleReinstallBot = () => {
    const searchParams = new URLSearchParams();
    searchParams.set("client_id", DISCORD_CLIENT_ID);
    searchParams.set("permissions", DISCORD_BOT_PERMISSIONS);
    searchParams.set("scope", "bot");
    searchParams.set("response_type", "code");
    searchParams.set("guild_id", ownerId);
    searchParams.set("redirect_uri", `${window.location.origin}/init`);

    window.location.assign(
      `https://discord.com/api/oauth2/authorize?${searchParams.toString()}`,
    );
  };

  const handleCreate = async () => {
    if (!selectedChannel) return;

    const channel = channels?.find((ch) => ch.channelId === selectedChannel);
    if (!channel) return;

    try {
      await createTarget.mutateAsync({
        ownerType,
        ownerId,
        provider: "discord",
        targetType: "channel",
        externalId: channel.channelId,
        displayName: channel.channelName,
      });
      toast.success(t("settings.notifications.toasts.targetCreated"));
      setSelectedChannel("");
      onOpenChange(false);
    } catch {
      toast.error(t("settings.notifications.toasts.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("settings.notifications.targets.addTarget")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {cannotSendMessages && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex flex-col gap-2 flex-1">
                <p className="text-sm text-destructive">
                  {t(
                    "settings.notifications.info.missingPermissionsDescription",
                  )}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReinstallBot}
                  className="w-full justify-center"
                >
                  <ExternalLink className="size-3.5" />
                  {t("settings.notifications.info.reinstallBot")}
                </Button>
              </div>
            </div>
          )}

          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  channelsLoading
                    ? t("settings.notifications.targets.loadingChannels")
                    : t("settings.notifications.targets.selectChannel")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {channels?.map((channel) => (
                <SelectItem key={channel.channelId} value={channel.channelId}>
                  # {channel.channelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("settings.notifications.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !selectedChannel ||
                createTarget.isPending ||
                !!cannotSendMessages
              }
            >
              {t("settings.notifications.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
