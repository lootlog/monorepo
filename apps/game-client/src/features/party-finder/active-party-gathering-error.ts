export class ActivePartyGatheringError extends Error {
  readonly code = "ACTIVE_GATHERING_EXISTS";

  constructor(readonly notificationId: string) {
    super("An active party gathering already exists");
    this.name = "ActivePartyGatheringError";
  }
}
