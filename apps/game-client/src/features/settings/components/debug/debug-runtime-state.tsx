import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { getRuntimeZoomFactor } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyStore } from "@/store/party.store";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { useTranslation } from "react-i18next";

export function DebugRuntimeState() {
  const { t } = useTranslation();
  const partyMembers = usePartyStore((s) => s.members);
  const othersById = useOthersStore((s) => s.othersById);
  const tooltipActiveOther = useCharacterTooltipCatchingGuildsStore(
    (s) => s.activeOther,
  );
  const tooltipActiveTarget = useCharacterTooltipCatchingGuildsStore(
    (s) => s.activeTarget,
  );
  const tooltipEntriesByKey = useCharacterTooltipCatchingGuildsStore(
    (s) => s.entriesByKey,
  );
  const tooltipIsShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (s) => s.isShiftPressed,
  );
  const zoomFactor = getRuntimeZoomFactor();
  const tooltipActiveOtherData = tooltipActiveOther?.d;
  const debugOthers = Object.entries(othersById).map(([storeId, other]) => {
    const handle = runtimeOtherHandles.get(storeId);
    const data = handle && "d" in handle ? handle.d : undefined;

    return {
      account: other.accountId,
      canvasObjectType:
        handle && "canvasObjectType" in handle
          ? handle.canvasObjectType
          : undefined,
      id: other.characterId,
      nick: other.name,
      storeId,
      x: data?.x,
      y: data?.y,
    };
  });

  return (
    <>
      <SettingsSection title={t("settings.debug.partyStateTitle")}>
        <SettingsPanel className="ll:p-2">
          {partyMembers.length === 0 ? (
            <SettingsEmptyState className="ll:border-none ll:bg-transparent ll:px-0 ll:py-0">
              {t("settings.debug.noPartyMembers")}
            </SettingsEmptyState>
          ) : (
            partyMembers.map((member) => (
              <div
                key={member.characterId}
                className="ll:text-xs ll:flex ll:gap-2 ll:items-center"
              >
                <span className="ll:text-white">{member.name}</span>
                <span className="ll:text-gray-400">
                  {t("settings.debug.partyMemberId", {
                    id: member.characterId,
                  })}
                </span>
                {member.isLeader && (
                  <span className="ll:text-yellow-400">
                    {t("settings.debug.leader")}
                  </span>
                )}
              </div>
            ))
          )}
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.characterTooltipStateTitle")}>
        <SettingsPanel className="ll:p-2 ll:space-y-2">
          <div className="ll:text-xs ll:text-gray-400">
            <div>
              {t("settings.debug.characterTooltip.shiftPressed", {
                value: tooltipIsShiftPressed
                  ? t("settings.debug.characterTooltip.pressed")
                  : t("settings.debug.characterTooltip.released"),
              })}
            </div>
            <div>
              {t("settings.debug.characterTooltip.activeTarget", {
                value:
                  tooltipActiveTarget?.key ?? t("settings.debug.notAvailable"),
              })}
            </div>
            <div>
              {t("settings.debug.characterTooltip.activeOther", {
                value:
                  tooltipActiveOtherData?.nick ??
                  tooltipActiveOtherData?.id ??
                  t("settings.debug.notAvailable"),
              })}
            </div>
          </div>
          <pre className="ll:max-h-40 ll:overflow-auto ll:whitespace-pre-wrap ll:break-words ll:text-[10px] ll:leading-4 ll:text-gray-300">
            {JSON.stringify(
              {
                activeOther: tooltipActiveOtherData
                  ? {
                      account: tooltipActiveOtherData.account,
                      id: tooltipActiveOtherData.id,
                      nick: tooltipActiveOtherData.nick,
                    }
                  : null,
                activeTarget: tooltipActiveTarget,
                entriesByKey: tooltipEntriesByKey,
                isShiftPressed: tooltipIsShiftPressed,
              },
              null,
              2,
            )}
          </pre>
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.othersStateTitle")}>
        <SettingsPanel className="ll:p-2 ll:space-y-2">
          <div className="ll:text-xs ll:text-gray-400">
            {t("settings.debug.othersCount", { count: debugOthers.length })}
          </div>
          <pre className="ll:max-h-48 ll:overflow-auto ll:whitespace-pre-wrap ll:break-words ll:text-[10px] ll:leading-4 ll:text-gray-300">
            {JSON.stringify(debugOthers, null, 2)}
          </pre>
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.systemInfoTitle")}>
        <SettingsPanel className="ll:space-y-1">
          <p className="ll:text-xs ll:text-gray-400">
            {t("settings.debug.zoomFactor", {
              value:
                zoomFactor !== null
                  ? zoomFactor
                  : t("settings.debug.notAvailable"),
            })}
          </p>
          <p className="ll:text-xs ll:text-gray-400">
            {t("settings.debug.mode", { mode: import.meta.env.MODE })}
          </p>
        </SettingsPanel>
      </SettingsSection>
    </>
  );
}
