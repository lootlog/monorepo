import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { Meilisearch, type SearchParams } from "meilisearch";
import type { z } from "zod";
import { MEILISEARCH_CLIENT } from "src/meilisearch/meilisearch.constants";
import type { GetNpcsDto } from "./dto/get-npcs.dto";
import { NPCS_INDEX } from "./constants/meilisearch";
import type { IndexNpcsDto } from "./dto/index-npcs.dto";
import type { npcHitSchema } from "./dto/npc-hit.schema";

type NpcHit = z.infer<typeof npcHitSchema>;

@Injectable()
export class NpcsService {
  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearch: Meilisearch,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getNpcs({ limit, search, world }: GetNpcsDto) {
    const index = this.meilisearch.index<NpcHit>(NPCS_INDEX);
    const hasMultipleSearchTerms = Array.isArray(search);
    const searchTerm = hasMultipleSearchTerms ? "" : (search ?? "");

    const filters: string[] = [];

    if (hasMultipleSearchTerms) {
      filters.push(
        `name IN [${search.map((name) => JSON.stringify(name)).join(", ")}]`,
      );
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

      const uniqueHits = Array.from(
        new Map(
          data.hits.map((npc) => [`${npc.name}_${npc.type}`, npc]),
        ).values(),
      );
      return uniqueHits;
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

    const npcsWithUid = validNpcs.map((npc) => ({
      ...npc,
      uid: `${npc.id}_${npc.type}_${npc.world}`,
    }));

    try {
      return index.addDocuments(npcsWithUid, { primaryKey: "uid" });
    } catch (error) {
      this.logger.error("Error indexing npcs", { error });
    }
  }
}
