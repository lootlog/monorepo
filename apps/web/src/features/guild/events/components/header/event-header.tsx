import { DetailBar } from "@/components/common/detail-bar";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { EventRulesDialog } from "../dialogs/event-rules-dialog";
import { EventSummaryDialog } from "../dialogs/event-summary-dialog";
import { EventStatusDialogs } from "../../event-status-dialogs";
import { useEventHeader } from "../../use-event-header";
import { EventHeaderActions } from "./event-header-actions";
import { EventHeaderMeta } from "./event-header-meta";
import { EventHeaderSkeleton } from "./event-header-skeleton";
import { EventPageTabs, type EventTab } from "./event-page-tabs";

type EventHeaderProps = {
  tab?: EventTab;
};

export const EventHeader = ({ tab }: EventHeaderProps) => {
  const header = useEventHeader();
  const { event, t } = header;

  if (!event) {
    if (!header.isEventError) return <EventHeaderSkeleton tab={tab} />;

    return (
      <>
        <QueryErrorNotice
          message={t("events.header.loadError")}
          onRetry={() => void header.refetchEvent()}
          isRetrying={header.isEventFetching}
          className={LIST_TILE_RULE_CLASS}
        />
        {tab && (
          <EventPageTabs
            guildId={header.queryGuildId}
            eventId={header.queryEventId}
            activeId={tab}
          />
        )}
      </>
    );
  }

  const meta = (
    <EventHeaderMeta
      t={t}
      event={event}
      eventStatusVariant={header.eventStatusVariant}
      eventStatusLabel={header.eventStatusLabel}
      eventDateRangeLabel={header.eventDateRangeLabel}
    />
  );

  const actions = (
    <EventHeaderActions
      {...header}
      event={event}
      isUpdatePending={header.updateEvent.isPending}
      isDeletePending={header.deleteEvent.isPending}
    />
  );

  return (
    <>
      <EventStatusDialogs {...header} event={event} />
      <EventRulesDialog
        open={header.rulesDialogOpen}
        onOpenChange={header.setRulesDialogOpen}
        eventName={event.name}
        rulebookMarkdown={event.rulebookMarkdown}
        scoringMode={header.scoringMode}
        scoringRules={header.scoringRules}
      />
      <EventSummaryDialog
        open={header.summaryDialogOpen}
        onOpenChange={header.setSummaryDialogOpen}
        guildId={header.queryGuildId}
        eventId={header.queryEventId}
        eventName={event.name}
      />
      <h1 className="sr-only">{event.name}</h1>
      <DetailBar meta={meta} actions={actions} />
      {tab && (
        <EventPageTabs
          guildId={header.queryGuildId}
          eventId={header.queryEventId}
          activeId={tab}
        />
      )}
    </>
  );
};
