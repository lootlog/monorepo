type PartyEventMember = {
  account: number;
  nick: string;
  icon: string;
  commander?: boolean | number;
  hp_cur?: number;
  hp_max?: number;
  prof?: string;
};

export type PartyEvent = {
  members: Record<string, PartyEventMember>;
  partyexp?: number;
  partygrpkill?: number;
};
