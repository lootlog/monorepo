import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserCheck } from "lucide-react";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { BandSection } from "@/components/common/band-section";
import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { ListTileEmpty } from "@/components/common/list-tile-empty";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { FactionWarDisqualifiedTile } from "./faction-war-disqualified-tile";
import {
  useFactionWarDisqualifications,
  type FactionWarDisqualification,
} from "./faction-war-queries";
import { FactionWarRestoreDialog } from "./faction-war-restore-dialog";

/** War admins only: who is excluded from the war, with a way to restore them. */
export const FactionWarDisqualifiedSection = ({ warId }: { warId: string }) => {
  const { t } = useTranslation();
  const disqualifications = useFactionWarDisqualifications(warId);
  const [restoring, setRestoring] = useState<FactionWarDisqualification>();

  const renderContent = () => {
    if (disqualifications.isPending) {
      return (
        <div aria-busy="true">
          <CardListSkeleton rows={2} card={<ListTileSkeleton actions={1} />} />
        </div>
      );
    }

    if (disqualifications.isError) {
      const isForbidden = getApiErrorStatus(disqualifications.error) === 403;

      return (
        <QueryErrorNotice
          message={t(
            isForbidden
              ? "factionWar.moderation.errors.forbidden"
              : "factionWar.moderation.listError",
          )}
          onRetry={
            isForbidden ? undefined : () => void disqualifications.refetch()
          }
          isRetrying={disqualifications.isFetching}
          className="border-b border-sidebar-border py-4"
        />
      );
    }

    if (disqualifications.data.length === 0) {
      return (
        <ListTileEmpty icon={UserCheck}>
          {t("factionWar.moderation.empty")}
        </ListTileEmpty>
      );
    }

    return (
      <ul>
        {disqualifications.data.map((disqualification) => (
          <FactionWarDisqualifiedTile
            key={disqualification.userId}
            warId={warId}
            disqualification={disqualification}
            onRestore={setRestoring}
          />
        ))}
      </ul>
    );
  };

  return (
    <BandSection
      id="faction-war-disqualified"
      title={t("factionWar.moderation.title")}
      description={t("factionWar.moderation.description")}
      count={disqualifications.data?.length}
      tiled
    >
      {renderContent()}
      {restoring && (
        <FactionWarRestoreDialog
          warId={warId}
          player={restoring}
          onClose={() => setRestoring(undefined)}
        />
      )}
    </BandSection>
  );
};
