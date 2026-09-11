import { cn } from "cn";
import type { ComponentProps } from "react";

function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="ll:relative ll:w-full ll:overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(
          "ll:w-full ll:caption-bottom ll:border-collapse ll:text-xs",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("ll:[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("ll:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "ll:bg-muted/50 ll:font-medium ll:[&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "ll:border-0 ll:border-b ll:border-solid ll:border-gray-400/20 ll:transition-colors ll:hover:bg-white/5 ll:data-[state=selected]:bg-primary/15 ll:data-[state=expanded-detail]:bg-black/20 ll:data-[state=expanded-detail]:hover:bg-black/20",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "ll:h-7 ll:whitespace-nowrap ll:px-2 ll:text-left ll:align-middle ll:text-[11px] ll:font-semibold ll:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "ll:h-7 ll:whitespace-nowrap ll:px-2 ll:py-1 ll:align-middle ll:text-gray-100",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "ll:mt-2 ll:text-[11px] ll:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
