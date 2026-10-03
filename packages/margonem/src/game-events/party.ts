export type PartyEventMember = {
  account: number;
  nick: string;
  icon: string;
  /** Margonem reads the leader flag by truthiness. */
  commander?: boolean | number;
  hp_cur?: number;
  hp_max?: number;
  prof?: string;
};

export type PartyEvent = {
  /** Keyed by character id; members carry no id of their own. */
  members: Record<string, PartyEventMember>;
  partyexp?: number;
  partygrpkill?: number;
};
