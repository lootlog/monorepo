export type PartyEventMember = {
  id: number;
  account: number;
  nick: string;
  icon: string;
  commander?: number;
};

export type PartyEvent = {
  members: Record<string, PartyEventMember>;
};
