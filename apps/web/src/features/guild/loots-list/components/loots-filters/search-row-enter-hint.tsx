import { CornerDownLeft } from "lucide-react";

/** Marks the highlighted palette row as the one Enter opens. */
export const SearchRowEnterHint = () => (
  <CornerDownLeft
    aria-hidden="true"
    className="size-4! opacity-0 group-data-[selected=true]:opacity-100 max-md:hidden"
  />
);
