-- AlterTable
ALTER TABLE "_LootToNpc" ADD CONSTRAINT "_LootToNpc_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_LootToNpc_AB_unique";

-- AlterTable
ALTER TABLE "_LootToPlayer" ADD CONSTRAINT "_LootToPlayer_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_LootToPlayer_AB_unique";

-- AlterTable
ALTER TABLE "_MemberToRole" ADD CONSTRAINT "_MemberToRole_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_MemberToRole_AB_unique";
