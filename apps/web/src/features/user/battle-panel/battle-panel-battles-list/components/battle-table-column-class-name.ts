export const getBattleTableColumnClassName = (columnId: string) => {
  if (columnId === "select") {
    return "relative w-[9%] px-0! md:w-12";
  }

  if (columnId === "status") {
    return "w-[10%] px-1 md:w-[64px]";
  }

  if (columnId === "battleInfo") {
    return "w-[20%] px-1 md:w-[176px]";
  }

  if (columnId === "leftTeam" || columnId === "rightTeam") {
    return "w-[24%] md:w-[240px]";
  }

  if (columnId === "createdAt") {
    return "w-[20%] md:w-[112px]";
  }

  if (columnId === "actions") {
    return "w-[14%] md:w-[64px]";
  }

  return "";
};
