import { PLATFORM_ROLES } from "@lootlog/schema/platform-roles";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { Link } from "@tanstack/react-router";
import { roleText, text } from "@/lib/messages";
import type { UsersSearch } from "@/lib/users-search";

const ANY = "any";

const roleItems = [
  { value: ANY, label: text.filterAnyRole },
  ...PLATFORM_ROLES.map((role) => ({
    value: role,
    label: roleText[role].name,
  })),
];

const statusItems = [
  { value: ANY, label: text.filterAnyStatus },
  { value: "yes", label: text.filterBanned },
  { value: "no", label: text.filterNotBanned },
];

export function UsersFilter({ search }: { search: UsersSearch }) {
  return (
    <form
      method="get"
      action="/"
      role="search"
      className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(0,1fr)_16rem_10rem_auto]"
    >
      <div className="grid gap-1.5 md:col-span-2 xl:col-span-1">
        <Label htmlFor="filter-search">{text.filterSearch}</Label>
        <Input
          id="filter-search"
          name="search"
          type="search"
          maxLength={100}
          defaultValue={search.search ?? ""}
          placeholder={text.filterSearchPlaceholder}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="filter-role">{text.filterRole}</Label>
        <Select name="role" items={roleItems} defaultValue={search.role ?? ANY}>
          <SelectTrigger id="filter-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="filter-banned">{text.filterStatus}</Label>
        <Select
          name="banned"
          items={statusItems}
          defaultValue={search.banned ?? ANY}
        >
          <SelectTrigger id="filter-banned" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit">{text.filterApply}</Button>
        <Link to="/" className={buttonVariants({ variant: "outline" })}>
          {text.filterClear}
        </Link>
      </div>
    </form>
  );
}
