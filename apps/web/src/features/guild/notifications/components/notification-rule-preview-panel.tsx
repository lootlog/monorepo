import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
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
    <SectionCard className="sticky top-0">
      <SectionCardHeader
        title={t("settings.notifications.templateEditor.previewLabel")}
        description={t(
          "settings.notifications.templateEditor.previewDescription",
        )}
      />
      <SectionCardContent>
        <div className="py-3 text-sm">
          <div className="max-w-none whitespace-pre-wrap break-words text-foreground [&_blockquote]:rounded-md [&_blockquote]:border [&_blockquote]:border-border [&_blockquote]:px-3 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_hr]:border-border [&_li]:ml-4 [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold">
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
      </SectionCardContent>
      <SectionCardFooter>
        <p className="text-xs text-muted-foreground">
          {t("settings.notifications.templateEditor.previewNotice")}
        </p>
      </SectionCardFooter>
    </SectionCard>
  );
};
