import type { ChatAppearanceSettings } from "@lootlog/types";
import { useTranslation } from "react-i18next";

interface ChatAppearancePreviewProps {
  settings: ChatAppearanceSettings;
}

export const ChatAppearancePreview = ({
  settings,
}: ChatAppearancePreviewProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="ll:rounded-lg ll:border ll:border-purple-400/30 ll:bg-gray-950/85 ll:p-3 ll:shadow-lg"
      style={{
        fontSize: `${settings.fontScalePercent}%`,
      }}
      aria-label={t("settings.chat.preview.ariaLabel")}
    >
      <div className="ll:mb-2 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-wider ll:text-purple-300">
        {t("settings.chat.preview.label")}
      </div>
      <div
        className="ll:flex ll:flex-col"
        style={{ gap: settings.messageGapPx }}
      >
        <div className="ll:rounded-md ll:bg-gray-800/75 ll:px-2.5 ll:py-2">
          <div className="ll:flex ll:items-center ll:gap-2">
            {settings.showNpcAvatar ? (
              <span className="ll:flex ll:size-6 ll:items-center ll:justify-center ll:rounded-full ll:bg-purple-500/30 ll:text-[10px]">
                AK
              </span>
            ) : null}
            <div className="ll:min-w-0">
              <div className="ll:font-semibold ll:text-purple-200">
                {t("settings.chat.preview.player")}
                {settings.showNpcLevel ? (
                  <span className="ll:ml-1 ll:text-gray-400">
                    {t("settings.chat.preview.level")}
                  </span>
                ) : null}
              </div>
              <div className="ll:text-gray-200">
                {t("settings.chat.preview.message")}
              </div>
            </div>
            {settings.showTimestamp ? (
              <span className="ll:ml-auto ll:self-start ll:text-[9px] ll:text-gray-500">
                21:37
              </span>
            ) : null}
          </div>
          {settings.showGuildLabel ? (
            <div className="ll:mt-1 ll:text-[9px] ll:text-sky-300">
              {t("settings.chat.preview.guild")}
            </div>
          ) : null}
        </div>
        <div
          className={
            settings.npcLayout === "tile"
              ? "ll:rounded-md ll:bg-amber-950/35 ll:px-2.5 ll:py-2"
              : "ll:px-1 ll:py-0.5 ll:text-amber-100"
          }
        >
          <span className="ll:font-semibold">
            {t("settings.chat.preview.npc")}
          </span>
          <span className="ll:text-gray-300">
            {" "}
            {t("settings.chat.preview.npcMessage")}
          </span>
          {settings.showNpcLocation ? (
            <span className="ll:ml-1 ll:text-gray-400">
              · {t("settings.chat.preview.location")}
              {settings.showNpcCoordinates ? " (42, 18)" : ""}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
