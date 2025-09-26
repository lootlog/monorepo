import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<Warrior>[] = [
  {
    accessorKey: "name",
    header: "Nick",
  },
  {
    accessorKey: "turns",
    header: "Tury",
  },
  {
    accessorKey: "damageDealt",
    header: "Obrażenia",
  },
  {
    accessorKey: "damageDealtAfterDefensive",
    header: "Zredukowane obrażenia",
  },
  {
    accessorKey: "evasions",
    header: "Uniki",
  },
  {
    accessorKey: "blocks",
    header: "Bloki",
  },
  {
    accessorKey: "criticalHits",
    header: "Ciosy krytyczne",
  },
];
