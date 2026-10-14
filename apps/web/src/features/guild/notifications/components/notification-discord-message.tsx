import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  previewMarkdownComponents,
  previewUrlTransform,
  replaceRoleMentions,
} from "../utils/notification-rule-form-preview.utils";
import {
  createPreviewTemplateValues,
  renderTemplatePreview,
} from "./notification-template-editor.utils";

type NotificationDiscordMessageProps = {
  contentTemplate: string;
  guildRoles: GuildRole[];
  className?: string;
};

/**
 * The rule's message as Discord shows it, with sample values in place of the
 * variables. It keeps Discord's own dark palette whatever the theme, since it
 * stands in for that screen.
 */
export const NotificationDiscordMessage = ({
  contentTemplate,
  guildRoles,
  className,
}: NotificationDiscordMessageProps) => {
  const { t } = useTranslation();

  const sampleValues = createPreviewTemplateValues(t);

  const content = replaceRoleMentions(
    renderTemplatePreview(contentTemplate, sampleValues),
    guildRoles,
  );

  return (
    <div
      className={cn(
        "flex gap-4 rounded-lg bg-[#313338] px-4 py-3 text-[15px] leading-[1.375] text-[#dbdee1]",
        className,
      )}
    >
      <img
        src="/brand/lootlog-mark.svg"
        alt=""
        className="mt-0.5 size-10 shrink-0 rounded-full bg-[#07111f] object-contain p-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5">
          <span className="font-medium text-[#f2f3f5]">Lootlog</span>
          <span className="rounded-[3px] bg-[#5865f2] px-1 text-[10px] leading-4 font-semibold text-white uppercase">
            {t("settings.notifications.templateEditor.discordAppTag")}
          </span>
          <span className="text-xs text-[#949ba4]">
            {sampleValues.scheduledFor}
          </span>
        </div>
        <div className="break-words whitespace-pre-wrap [&_blockquote]:border-l-4 [&_blockquote]:border-[#4e5058] [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[#2b2d31] [&_code]:px-1 [&_code]:text-[13px] [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_li]:ml-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[#2b2d31] [&_pre]:p-2 [&_strong]:font-bold">
          {content.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={previewMarkdownComponents}
              urlTransform={previewUrlTransform}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <span className="text-[#949ba4] italic">
              {t("settings.notifications.templateEditor.previewEmpty")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
