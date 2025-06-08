import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ChatService } from 'src/chat/chat.service';
import { SendMessageDto } from 'src/chat/dto/send-message.dto';
import { Guild, Permission } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

@UseGuards(AuthGuard)
@Controller('')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Permissions(Permission.LOOTLOG_CHAT_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/chat-messages')
  async getChatMessages(@GuildData() guild: Guild) {
    return this.chatService.getMessages(guild.id);
  }

  @Permissions(Permission.LOOTLOG_CHAT_WRITE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/chat-messages')
  async sendChatMessage(
    @Body() data: SendMessageDto,
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.chatService.sendMessage(discordId, guild.id, data);
  }
}
