import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FetchGuildNpcsDto } from 'src/npcs/dto/fetch-guild-npcs.dto';
import { NpcsService } from 'src/npcs/npcs.service';
import { AuthGuard } from 'src/shared/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('')
export class NpcsController {
  constructor(private readonly npcsService: NpcsService) {}

  @Get('/npcs')
  async getTimers(@Query() query: FetchGuildNpcsDto) {
    return this.npcsService.getNpcs(query);
  }
}
