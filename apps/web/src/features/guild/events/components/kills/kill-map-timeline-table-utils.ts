export const getKillMapTimelineColumnWidthClassName = (columnId: string) => {
  if (columnId === "id") {
    return "w-16";
  }

  if (columnId === "participants") {
    return "w-36";
  }

  if (columnId === "coverage") {
    return "w-16 md:w-20";
  }

  if (columnId === "actions") {
    return "w-12";
  }

  return "";
};

export const getKillMapTimelineColumnClassName = (columnId: string) => {
  if (columnId === "id") {
    return getKillMapTimelineColumnWidthClassName(columnId);
  }

  if (columnId === "map") {
    return "min-w-0";
  }

  if (columnId === "participants") {
    return getKillMapTimelineColumnWidthClassName(columnId);
  }

  if (columnId === "coverage") {
    return "w-16 px-0! text-right md:w-20 md:px-2!";
  }

  if (columnId === "actions") {
    return "w-12 p-0! text-right";
  }

  return "";
};
