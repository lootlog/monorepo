import { Inject, Injectable } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import { NPCS_INDEX } from 'src/npcs/config/meilisearch.config';
import { CreateNpcDto } from 'src/npcs/dto/create-npc.dto';
import { FetchGuildNpcsDto } from 'src/npcs/dto/fetch-guild-npcs.dto';

@Injectable()
export class NpcsService {
  constructor(
    @Inject('MeiliSearch') private readonly meilisearch: Meilisearch,
  ) {}

  async getNpcs(query: FetchGuildNpcsDto) {
    const limit = parseInt(query.limit ?? '10', 10);
    const search = query.search ?? undefined;

    const index = this.meilisearch.index(NPCS_INDEX);

    try {
      const data = await index.search(search, {
        limit,
        attributesToSearchOn: ['name'],
      });
      return data.hits;
    } catch (error) {
      return [];
    }
  }

  async bulkIndexNpcs(npcs: CreateNpcDto[]) {
    const res = await this.meilisearch
      .index(NPCS_INDEX)
      .addDocuments(
        npcs.map((player) => ({ ...player, id: Number(player.id) })),
      );

    return res;
  }

  async verifyIndex() {
    try {
      await this.meilisearch.getIndex(NPCS_INDEX);
    } catch (error) {
      await this.meilisearch.createIndex(NPCS_INDEX);
    }
  }
}
