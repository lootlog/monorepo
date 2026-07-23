import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@lootlog/ui/components/card";
import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/api-client/models/main/role-response-dto-output";
import {
  createPreviewTemplateValues,
  renderTemplatePreview,
} from "./notification-template-editor";
import {
  replaceRoleMentions,
  previewUrlTransform,
  previewMarkdownComponents,
} from "../utils/notification-rule-form-preview.utils";

interface NotificationRulePreviewPanelProps {
  contentTemplate: string;
  guildRoles: GuildRole[];
}

export const NotificationRulePreviewPanel = ({
  contentTemplate,
  guildRoles,
}: NotificationRulePreviewPanelProps) => {
  const { t } = useTranslation();
  const previewTemplateValues = createPreviewTemplateValues(t);

  return (
    <Card className="sticky top-0 gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t("settings.notifications.templateEditor.previewLabel")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("settings.notifications.templateEditor.previewDescription")}
      </p>
      <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-4 text-sm">
        <div className="max-w-none whitespace-pre-wrap break-words text-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_hr]:border-border [&_li]:ml-4 [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={previewMarkdownComponents}
            urlTransform={previewUrlTransform}
          >
            {replaceRoleMentions(
              renderTemplatePreview(contentTemplate, previewTemplateValues),
              guildRoles,
            )}
          </ReactMarkdown>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("settings.notifications.templateEditor.previewNotice")}
      </p>
    </Card>
  );
};
