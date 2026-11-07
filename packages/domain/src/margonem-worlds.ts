/**
 * Margonem's public worlds by the day each opened, newest first, from the
 * game's announcements. A world has the items of every event edition that
 * ended after it opened, so the item search hides the older ones for a
 * character there. Worlds opened before 2019 have only an approximate day,
 * the first announcement that names them: the catalog's events are newer.
 */
export const MARGONEM_WORLDS = [
  { id: "luvia", name: "Luvia", openedOn: "2026-06-29", isApproximate: false },
  {
    id: "gordion",
    name: "Gordion",
    openedOn: "2023-02-24",
    isApproximate: false,
  },
  {
    id: "aether",
    name: "Aether",
    openedOn: "2021-01-27",
    isApproximate: false,
  },
  { id: "fobos", name: "Fobos", openedOn: "2019-03-01", isApproximate: false },
  {
    id: "tempest",
    name: "Tempest",
    openedOn: "2016-06-27",
    isApproximate: true,
  },
  { id: "nomada", name: "Nomada", openedOn: "2015-08-18", isApproximate: true },
  { id: "aldous", name: "Aldous", openedOn: "2015-05-14", isApproximate: true },
  { id: "berufs", name: "Berufs", openedOn: "2013-09-20", isApproximate: true },
  { id: "brutal", name: "Brutal", openedOn: "2013-03-11", isApproximate: true },
  { id: "gefion", name: "Gefion", openedOn: "2012-09-30", isApproximate: true },
  { id: "majuna", name: "Majuna", openedOn: "2011-06-30", isApproximate: true },
  { id: "perkun", name: "Perkun", openedOn: "2010-11-08", isApproximate: true },
  { id: "zorza", name: "Zorza", openedOn: "2010-03-31", isApproximate: true },
  { id: "jaruna", name: "Jaruna", openedOn: "2009-12-10", isApproximate: true },
  { id: "hutena", name: "Hutena", openedOn: "2009-11-08", isApproximate: true },
  { id: "zemyna", name: "Zemyna", openedOn: "2009-07-01", isApproximate: true },
  {
    id: "lelwani",
    name: "Lelwani",
    openedOn: "2009-04-30",
    isApproximate: true,
  },
  {
    id: "telawel",
    name: "Telawel",
    openedOn: "2009-02-09",
    isApproximate: true,
  },
  {
    id: "classic",
    name: "Classic",
    openedOn: "2008-11-01",
    isApproximate: true,
  },
  {
    id: "tarhuna",
    name: "Tarhuna",
    openedOn: "2008-11-01",
    isApproximate: true,
  },
  {
    id: "katahha",
    name: "Katahha",
    openedOn: "2008-11-01",
    isApproximate: true,
  },
] as const;

export const findMargonemWorld = (id: string) =>
  MARGONEM_WORLDS.find((world) => world.id === id);
