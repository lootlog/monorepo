import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { NotificationDiscordMessage } from "./notification-discord-message";

type NotificationMessagePreviewProps = {
  contentTemplate: string;
  guildRoles: GuildRole[];
  /** Off where a tab already names the preview. */
  withLabel?: boolean;
};

/** The message as it will look on Discord, named as a preview with sample data. */
export const NotificationMessagePreview = ({
  contentTemplate,
  guildRoles,
  withLabel = true,
}: NotificationMessagePreviewProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      {withLabel && (
        <span className="text-sm font-medium">
          {t("settings.notifications.templateEditor.previewLabel")}
        </span>
      )}
      <NotificationDiscordMessage
        contentTemplate={contentTemplate}
        guildRoles={guildRoles}
      />
      <p className="text-xs text-muted-foreground">
        {t("settings.notifications.templateEditor.previewNotice")}
      </p>
    </div>
  );
};
