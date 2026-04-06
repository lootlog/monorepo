export type PartyEventMember = {
  id: number;
  account: number;
  nick: string;
  icon: string;
  commander?: number;
  hp_cur?: number;
  hp_max?: number;
};

export type PartyEvent = {
  members: Record<string, PartyEventMember>;
  partyexp?: number;
  partygrpkill?: number;
};
