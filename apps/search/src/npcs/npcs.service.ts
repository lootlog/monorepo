import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import type { Meilisearch, SearchParams } from "meilisearch";
import { buildMeilisearchSearchTermFilter } from "#src/meilisearch/meilisearch.utils";
import type { AppLogger } from "#src/shared/logger";
import { getNpcTypeByWt } from "./npc-type.js";
import type { GetNpcsDto } from "./dto/get-npcs.dto.js";
import { NPCS_INDEX } from "./constants/meilisearch.js";
import type { IndexNpcsDto } from "./dto/index-npcs.dto.js";
import type { NpcHit } from "./dto/npc-hit.schema.js";

type RawNpcHit = Omit<NpcHit, "margonemType" | "prof" | "type"> & {
  margonemType?: number | null;
  prof?: string | null;
  type?: NpcHit["type"] | number | string | null;
};

export class NpcsService {
  constructor(
    private readonly meilisearch: Meilisearch,
    private readonly logger: AppLogger,
  ) {}

  async getNpcs({ ids, limit, search, world }: GetNpcsDto) {
    const index = this.meilisearch.index<RawNpcHit>(NPCS_INDEX);
    const { filter: searchFilter, searchTerm } =
      buildMeilisearchSearchTermFilter("name", search);

    const filters: string[] = [];

    if (searchFilter) {
      filters.push(searchFilter);
    }

    if (ids && ids.length > 0) {
      filters.push(`id IN [${ids.join(", ")}]`);
    }

    if (world) {
      filters.push(`world = "${world}"`);
    }

    const query: SearchParams = {
      limit,
      attributesToSearchOn: ["name"],
      ...(filters.length > 0 && { filter: filters.join(" AND ") }),
    };

    try {
      const data = await index.search(searchTerm, query);
      const hits = data.hits.map((npc) => this.normalizeNpcHit(npc));

      if (ids && ids.length > 0) {
        return hits;
      }

      return this.getUniqueNpcsByNameAndType(hits);
    } catch (error) {
      this.logger.error("NPC search error", { error });
      return [];
    }
  }

  async indexNpcs(data: IndexNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);

    const validNpcs = data.npcs.filter(
      (npc) => npc.world && npc.id && npc.name,
    );

    if (validNpcs.length === 0) {
      this.logger.warn("No valid npcs to index (missing required fields)", {
        npcs: data.npcs,
      });
      return;
    }

    if (validNpcs.length !== data.npcs.length) {
      const invalidNpcs = data.npcs.filter(
        (npc) => !npc.world || !npc.id || !npc.name,
      );
      this.logger.warn(
        `Skipped ${invalidNpcs.length} npcs due to missing required fields`,
        { invalidNpcs },
      );
    }

    const npcsWithUid = validNpcs.map((npc) => {
      const prof = npc.prof ?? "";

      return {
        ...npc,
        prof,
        type: getNpcTypeByWt(npc.wt, prof, npc.margonemType),
        uid: `${npc.id}_${npc.margonemType}_${npc.world}`,
      };
    });

    try {
      return await index.addDocuments(npcsWithUid, { primaryKey: "uid" });
    } catch (error) {
      this.logger.error("Error indexing npcs", { error });
    }
  }

  private normalizeNpcHit(npc: RawNpcHit): NpcHit {
    const prof = npc.prof ?? "";
    const margonemType = this.getMargonemType(npc);

    return {
      ...npc,
      prof,
      margonemType,
      type: this.getNpcType(npc, prof, margonemType),
    };
  }

  private getMargonemType(npc: RawNpcHit): number {
    if (typeof npc.margonemType === "number") {
      return npc.margonemType;
    }

    if (typeof npc.type === "number") {
      return npc.type;
    }

    return 0;
  }

  private getNpcType(
    npc: RawNpcHit,
    prof: string,
    margonemType: number,
  ): NpcTypeEnum {
    if (
      typeof npc.type === "string" &&
      Object.values(NpcTypeEnum).includes(npc.type as NpcTypeEnum)
    ) {
      return npc.type as NpcTypeEnum;
    }

    return getNpcTypeByWt(npc.wt, prof, margonemType);
  }

  private getUniqueNpcsByNameAndType(npcs: NpcHit[]) {
    const seenNpcKeys = new Set<string>();

    return npcs.filter((npc) => {
      const npcKey = `${npc.name}_${npc.type}`;

      if (seenNpcKeys.has(npcKey)) {
        return false;
      }

      seenNpcKeys.add(npcKey);
      return true;
    });
  }
}
