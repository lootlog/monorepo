import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { ChangeEventHandler, FC } from "react";

type SearchInputProps = {
  value: string;
  placeholder: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export const SearchInput: FC<SearchInputProps> = ({
  value,
  placeholder,
  onChange,
}) => {
  return (
    <div className="ll:relative ll:flex-1 ll:min-w-0">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="ll:pr-7"
      />
      <Search className="ll:absolute ll:right-2 ll:top-1/2 ll:h-3.5 ll:w-3.5 ll:-translate-y-1/2 ll:text-gray-400 ll:pointer-events-none" />
    </div>
  );
};
