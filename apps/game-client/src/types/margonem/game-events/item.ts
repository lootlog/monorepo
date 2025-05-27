export type ItemEvent = {
  [key: string]: Item;
};

export type Item = {
  hid: string;
  icon: string;
  name: string;
  pr: number;
  prc: string;
  st: number;
  stat: string;
  own: number;
  cl: number;
  tpl: number;
  loc: "g" | "l" | "k";
};
