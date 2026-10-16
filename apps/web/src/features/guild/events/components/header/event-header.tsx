import { DetailBar } from "@/components/common/detail-bar";
import { EventRulesDialog } from "../dialogs/event-rules-dialog";
import { EventSummaryDialog } from "../dialogs/event-summary-dialog";
import { EventStatusDialogs } from "../../event-status-dialogs";
import { useEventHeader } from "../../use-event-header";
import { EventHeaderActions } from "./event-header-actions";
import { EventHeaderMeta } from "./event-header-meta";
import { EventPageTabs, type EventTab } from "./event-page-tabs";

type EventHeaderProps = {
  /** The section the page shows; pages outside the tabs leave it out. */
  tab?: EventTab;
};

/**
 * What every section of an event opens with: its details and actions, then
 * the section tabs. It renders straight in the page scroller marked
 * `data-under-top-bar`, so the tabs stay pinned.
 */
export const EventHeader = ({ tab }: EventHeaderProps) => {
  const header = useEventHeader();
  const { event, t } = header;

  if (!event) return null;

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
