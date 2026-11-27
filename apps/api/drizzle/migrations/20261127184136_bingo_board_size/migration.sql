ALTER TABLE "BingoBoard" ADD COLUMN "size" smallint DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "BingoBoard" ADD CONSTRAINT "BingoBoard_size_check" CHECK ("size" BETWEEN 3 AND 7);--> statement-breakpoint
ALTER TABLE "BingoTile" DROP CONSTRAINT "BingoTile_row_col_bounds_check", ADD CONSTRAINT "BingoTile_row_col_bounds_check" CHECK ("row" >= 0 AND "row" < 7 AND "col" >= 0 AND "col" < 7);