import { format } from "date-fns";

export const timestampToDate = (
  timestamp: string,
  dateFormat = "dd/MM/yyyy - HH:mm"
) => {
  return format(new Date(timestamp), dateFormat);
};
