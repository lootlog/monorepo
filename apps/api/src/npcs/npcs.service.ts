import { Injectable } from '@nestjs/common';
import { CreateNpcDto } from 'src/npcs/dto/create-npc.dto';
import { FetchGuildNpcsDto } from 'src/npcs/dto/fetch-guild-npcs.dto';

@Injectable()
export class NpcsService {
  constructor() {}

  async getNpcs(query: FetchGuildNpcsDto) {
    return [];
  }

  async bulkIndexNpcs(npcs: CreateNpcDto[]) {
    return undefined;
  }
}
