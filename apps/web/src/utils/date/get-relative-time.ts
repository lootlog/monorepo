import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

export const getRelativeTime = (date: string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
};
