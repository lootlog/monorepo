import type {
  RuntimeEventEnvelope,
  RuntimeEventHandler,
} from "./runtime.types";
import {
  margonemRuntimeBridge,
  type MargonemRuntimeBridge,
} from "./margonem-runtime-bridge";
import {
  runtimeStateProjection,
  type RuntimeStateProjection,
} from "./runtime-state-projection";

const MAX_PENDING_EVENTS = 1_000;
const MAX_PENDING_FACTS = 10_000;

type ScheduledWork = unknown;

type Dependencies = {
  bridge: Pick<MargonemRuntimeBridge, "subscribeApplied">;
  cancel: (work: ScheduledWork) => void;
  onOverflow?: () => void;
  onProcessingError?: (error: unknown) => void;
  projection: Pick<RuntimeStateProjection, "apply" | "captureIngress">;
  schedule: (callback: () => void) => ScheduledWork;
};

const defaultSchedule = (callback: () => void): ScheduledWork =>
  setTimeout(callback, 0);

const defaultCancel = (work: ScheduledWork): void => {
  clearTimeout(work as ReturnType<typeof setTimeout>);
};

export class RuntimeEventPipeline {
  private readonly bridge: Dependencies["bridge"];
  private readonly cancel: Dependencies["cancel"];
  private readonly onOverflow?: Dependencies["onOverflow"];
  private readonly onProcessingError?: Dependencies["onProcessingError"];
  private readonly projection: Dependencies["projection"];
  private readonly schedule: Dependencies["schedule"];
  private readonly queue: RuntimeEventEnvelope[] = [];
  private readonly processorRegistrations = new Set<symbol>();
  private readonly projectedHandlers = new Set<RuntimeEventHandler>();
  private activeProcessor: RuntimeEventHandler | null = null;
  private overflowed = false;
  private pendingFacts = 0;
  private ready = false;
  private scheduledWork: ScheduledWork | null = null;
  private unsubscribeApplied: (() => void) | null = null;

  constructor(dependencies?: Partial<Dependencies>) {
    this.bridge = dependencies?.bridge ?? margonemRuntimeBridge;
    this.cancel = dependencies?.cancel ?? defaultCancel;
    this.onOverflow = dependencies?.onOverflow;
    this.onProcessingError = dependencies?.onProcessingError;
    this.projection = dependencies?.projection ?? runtimeStateProjection;
    this.schedule = dependencies?.schedule ?? defaultSchedule;
  }

  install(): void {
    this.unsubscribeApplied?.();
    this.unsubscribeApplied = this.bridge.subscribeApplied(this.enqueue);
  }

  setReady(ready = true): void {
    if (this.overflowed) return;
    this.ready = ready;
    if (ready) this.scheduleDrain();
  }

  acquireProcessor(processor: RuntimeEventHandler): () => boolean {
    this.activeProcessor ??= processor;
    const registration = Symbol("runtime-pipeline-processor");
    this.processorRegistrations.add(registration);
    let released = false;

    return () => {
      if (released) return false;
      released = true;
      if (!this.processorRegistrations.delete(registration)) return false;
      if (this.processorRegistrations.size > 0) return false;

      this.activeProcessor = null;
      return true;
    };
  }

  subscribeProjected(handler: RuntimeEventHandler): () => void {
    this.projectedHandlers.add(handler);
    return () => this.projectedHandlers.delete(handler);
  }

  flush(): void {
    if (this.scheduledWork !== null) {
      this.cancel(this.scheduledWork);
      this.scheduledWork = null;
    }
    while (this.ready && this.queue.length > 0) this.processNext();
  }

  cleanup(): void {
    this.unsubscribeApplied?.();
    this.unsubscribeApplied = null;
    if (this.scheduledWork !== null) this.cancel(this.scheduledWork);
    this.scheduledWork = null;
    this.queue.length = 0;
    this.pendingFacts = 0;
    this.overflowed = false;
    this.ready = false;
    this.activeProcessor = null;
    this.processorRegistrations.clear();
    this.projectedHandlers.clear();
  }

  private readonly enqueue = (envelope: RuntimeEventEnvelope): void => {
    const nextFacts = this.pendingFacts + envelope.facts.length;
    if (
      this.queue.length >= MAX_PENDING_EVENTS ||
      nextFacts > MAX_PENDING_FACTS
    ) {
      if (this.overflowed) return;
      this.overflowed = true;
      this.ready = false;
      this.queue.length = 0;
      this.pendingFacts = 0;
      if (this.scheduledWork !== null) this.cancel(this.scheduledWork);
      this.scheduledWork = null;
      this.onOverflow?.();
      return;
    }

    this.queue.push(envelope);
    this.pendingFacts = nextFacts;
    if (this.ready) this.scheduleDrain();
  };

  private scheduleDrain(): void {
    if (this.scheduledWork !== null || this.queue.length === 0) return;
    this.scheduledWork = this.schedule(this.drainQueue);
  }

  private readonly drainQueue = (): void => {
    this.scheduledWork = null;
    if (!this.ready) return;

    while (this.queue.length > 0) this.processNext();
  };

  private processNext(): void {
    const envelope = this.queue.shift();
    if (!envelope) return;
    this.pendingFacts -= envelope.facts.length;

    try {
      const projectedEnvelope = this.projection.captureIngress(envelope);
      this.projection.apply(projectedEnvelope);
      try {
        this.activeProcessor?.(projectedEnvelope);
      } catch (error) {
        this.onProcessingError?.(error);
      }
      for (const handler of this.projectedHandlers) {
        try {
          handler(projectedEnvelope);
        } catch (error) {
          this.onProcessingError?.(error);
        }
      }
    } catch (error) {
      this.onProcessingError?.(error);
    }
  }
}

export const runtimeEventPipeline = new RuntimeEventPipeline({
  onOverflow: () => {
    setTimeout(() => {
      const runtimeWindow = window as Window & {
        __lootlogGameClientRuntime?: { dispose: () => void };
      };
      runtimeWindow.__lootlogGameClientRuntime?.dispose();
    }, 0);
  },
  onProcessingError: (error) => {
    console.warn("[RuntimeEventPipeline] Failed to process event:", error);
  },
});
