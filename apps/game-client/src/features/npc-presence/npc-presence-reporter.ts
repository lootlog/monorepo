import {
  NPC_PRESENCE_MAP_MAX_LENGTH,
  NPC_PRESENCE_MAX_NPCS,
  NPC_PRESENCE_MIN_WT,
  type NpcPresenceNpc,
  type NpcPresenceReport,
  type NpcPresenceReportAck,
} from "@lootlog/schema/npc-presence";
import { useNpcsStore } from "@/store/npcs.store";

export const NPC_PRESENCE_REPORT_DELAY_MS = 250;

const NPC_PRESENCE_RETRY_MS = 5_000;

type ReportSender = (
  report: NpcPresenceReport,
) => Promise<NpcPresenceReportAck>;

type ReporterContext = {
  ready: boolean;
  world: string | null;
  map?: string | null;
  characterId: string | null;
  organizationIds: readonly string[] | undefined;
  send: ReportSender;
};

const toReportedNpcs = (): NpcPresenceNpc[] =>
  Object.values(useNpcsStore.getState().npcsById)
    .filter((npc) => npc.weight >= NPC_PRESENCE_MIN_WT)
    .sort((first, second) => first.id - second.id)
    .slice(0, NPC_PRESENCE_MAX_NPCS)
    .map((npc) => ({
      id: npc.id,
      lvl: npc.level,
      wt: npc.weight,
      prof: npc.profession,
      type: npc.type,
    }));

export class NpcPresenceReporter {
  private context: ReporterContext | null = null;
  private unsubscribeNpcs: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sentKey: string | null = null;
  private sending = false;

  configure(context: ReporterContext): void {
    const previous = this.context;
    this.context = context;

    if (!context.ready) {
      this.sentKey = null;
      this.stopWatching();

      return;
    }

    if (!previous?.ready || previous.characterId !== context.characterId)
      this.sentKey = null;
    this.startWatching();
    this.schedule(0);
  }

  shutdown(): void {
    this.context = null;
    this.sentKey = null;
    this.stopWatching();
  }

  private startWatching(): void {
    if (this.unsubscribeNpcs) return;
    this.unsubscribeNpcs = useNpcsStore.subscribe((state, previous) => {
      if (state.npcsById !== previous.npcsById)
        this.schedule(NPC_PRESENCE_REPORT_DELAY_MS);
    });
  }

  private stopWatching(): void {
    this.unsubscribeNpcs?.();
    this.unsubscribeNpcs = null;

    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delayMs: number): void {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delayMs);
  }

  private async flush(): Promise<void> {
    const context = this.context;

    if (!context?.ready || !context.world || !context.organizationIds) return;

    if (this.sending) {
      this.schedule(NPC_PRESENCE_REPORT_DELAY_MS);

      return;
    }

    const reported = {
      world: context.world,
      organizationIds: [...context.organizationIds].sort(),
      npcs: toReportedNpcs(),
    };

    const report: NpcPresenceReport =
      context.map && context.map.length <= NPC_PRESENCE_MAP_MAX_LENGTH
        ? { ...reported, map: context.map }
        : reported;

    const key = JSON.stringify(report);

    if (key === this.sentKey || (this.sentKey === null && !report.npcs.length))
      return;

    this.sending = true;

    try {
      const ack = await context.send(report);

      if (this.context !== context) return;

      if (ack.status === "accepted") this.sentKey = key;
      else if (ack.code !== "forbidden" && ack.code !== "invalid-payload")
        this.schedule(ack.retryAfterMs ?? NPC_PRESENCE_RETRY_MS);
    } catch {
      if (this.context === context) this.schedule(NPC_PRESENCE_RETRY_MS);
    } finally {
      this.sending = false;
    }
  }
}

export const npcPresenceReporter = new NpcPresenceReporter();
